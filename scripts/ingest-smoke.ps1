#requires -Version 7
<#
.SYNOPSIS
    End-to-end smoke test for MetricsApp ingestion endpoints.

.DESCRIPTION
    Posts representative payloads to each ingestion path:
      1. POST /api/v1/ingest/events           (raw EventDto[])
      2. POST /api/v1/ingest/otlp/logs        (OTLP JSON logs)
      3. POST /api/v1/ingest/otlp/metrics     (OTLP JSON metrics)
      4. POST /api/v1/ingest/otlp/traces      (OTLP JSON traces)
      5. Negative: POST /api/v1/ingest/otlp/metrics with protobuf -> expects 415
      6. Negative: POST /api/v1/ingest/events with malformed JSON -> expects 400

    Then queries /api/v1/Telemetry/logs and /api/v1/Telemetry/metrics to confirm
    persistence (best-effort - the worker may take a moment to drain the queue).

.PARAMETER ApiBaseUrl
    The MetricsApp API base URL. Defaults to https://localhost:7201.

.PARAMETER WaitSeconds
    Seconds to wait between posting and querying so the worker can flush.

.EXAMPLE
    pwsh ./scripts/ingest-smoke.ps1
    pwsh ./scripts/ingest-smoke.ps1 -ApiBaseUrl http://localhost:5000
#>

[CmdletBinding()]
param(
    [string]$ApiBaseUrl = $env:METRICSAPP_API_BASE_URL,
    [int]$WaitSeconds = 3
)

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    $ApiBaseUrl = 'https://localhost:7201'
}

$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
    param([string]$Name, [bool]$Pass, [string]$Detail)
    $results.Add([pscustomobject]@{ Test = $Name; Pass = $Pass; Detail = $Detail })
    $marker = if ($Pass) { 'OK ' } else { 'FAIL' }
    Write-Host ("[{0}] {1} - {2}" -f $marker, $Name, $Detail)
}

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        $Body,
        [string]$ContentType = 'application/json'
    )
    $headers = @{ 'Accept' = 'application/json' }
    $bodyText = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 12 }
    return Invoke-WebRequest `
        -Method $Method `
        -Uri $Url `
        -Body $bodyText `
        -ContentType $ContentType `
        -Headers $headers `
        -SkipCertificateCheck `
        -SkipHttpErrorCheck
}

Write-Host "MetricsApp ingest smoke test against $ApiBaseUrl" -ForegroundColor Cyan

$nowIso = (Get-Date).ToUniversalTime().ToString('o')
$nowUnixNano = [int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) * 1000000

# 1) Raw events
$rawEvents = @(
    @{
        timestamp = $nowIso
        tenantId  = 'default'
        appId     = 'smoke-sender'
        type      = 'log'
        sourceType = 'raw-event'
        hostName  = $env:COMPUTERNAME
        logLevel  = 'INFO'
        payload   = @{
            message = "smoke raw log $($nowIso)"
            attribute1 = 'value1'
            count = 7
        }
    },
    @{
        timestamp = $nowIso
        tenantId  = 'default'
        appId     = 'smoke-sender'
        type      = 'metric'
        sourceType = 'raw-event'
        hostName  = $env:COMPUTERNAME
        logLevel  = 'INFO'
        payload   = @{
            name = 'smoke.gauge'
            value = 42.5
            unit = 'count'
            attributes = @{ region = 'local' }
        }
    }
)
try {
    $resp = Invoke-Json -Method POST -Url "$ApiBaseUrl/api/v1/ingest/events" -Body $rawEvents
    Add-Result 'raw-events' ($resp.StatusCode -eq 202) "Status $($resp.StatusCode) $($resp.Content)"
} catch {
    Add-Result 'raw-events' $false $_.Exception.Message
}

# 2) OTLP logs
$otlpLogs = @{
    resourceLogs = @(@{
        resource = @{
            attributes = @(
                @{ key = 'service.name'; value = @{ stringValue = 'smoke-sender' } },
                @{ key = 'host.name';    value = @{ stringValue = $env:COMPUTERNAME } }
            )
        }
        scopeLogs = @(@{
            scope = @{ name = 'smoke'; version = '1.0' }
            logRecords = @(@{
                timeUnixNano = "$nowUnixNano"
                severityNumber = 9
                severityText = 'INFO'
                body = @{ stringValue = 'otlp log smoke' }
                attributes = @(@{ key = 'env'; value = @{ stringValue = 'dev' } })
            })
        })
    })
}
try {
    $resp = Invoke-Json -Method POST -Url "$ApiBaseUrl/api/v1/ingest/otlp/logs" -Body $otlpLogs
    Add-Result 'otlp-logs' ($resp.StatusCode -eq 200) "Status $($resp.StatusCode)"
} catch {
    Add-Result 'otlp-logs' $false $_.Exception.Message
}

# 3) OTLP metrics
$otlpMetrics = @{
    resourceMetrics = @(@{
        resource = @{
            attributes = @(@{ key = 'service.name'; value = @{ stringValue = 'smoke-sender' } })
        }
        scopeMetrics = @(@{
            scope = @{ name = 'smoke'; version = '1.0' }
            metrics = @(@{
                name = 'smoke.requests'
                description = 'smoke request count'
                unit = 'count'
                sum = @{
                    isMonotonic = $true
                    aggregationTemporality = 2
                    dataPoints = @(@{
                        timeUnixNano = "$nowUnixNano"
                        asInt = 13
                        attributes = @(@{ key = 'route'; value = @{ stringValue = '/smoke' } })
                    })
                }
            })
        })
    })
}
try {
    $resp = Invoke-Json -Method POST -Url "$ApiBaseUrl/api/v1/ingest/otlp/metrics" -Body $otlpMetrics
    Add-Result 'otlp-metrics' ($resp.StatusCode -eq 200) "Status $($resp.StatusCode)"
} catch {
    Add-Result 'otlp-metrics' $false $_.Exception.Message
}

# 4) OTLP traces
$traceId = ([guid]::NewGuid().ToString('N'))
$spanId  = ([guid]::NewGuid().ToString('N').Substring(0,16))
$otlpTraces = @{
    resourceSpans = @(@{
        resource = @{
            attributes = @(@{ key = 'service.name'; value = @{ stringValue = 'smoke-sender' } })
        }
        scopeSpans = @(@{
            scope = @{ name = 'smoke'; version = '1.0' }
            spans = @(@{
                traceId = $traceId
                spanId  = $spanId
                name    = 'smoke-span'
                kind    = 1
                startTimeUnixNano = "$nowUnixNano"
                endTimeUnixNano   = "$($nowUnixNano + 1000000)"
                status = @{ code = 1 }
            })
        })
    })
}
try {
    $resp = Invoke-Json -Method POST -Url "$ApiBaseUrl/api/v1/ingest/otlp/traces" -Body $otlpTraces
    Add-Result 'otlp-traces' ($resp.StatusCode -eq 200) "Status $($resp.StatusCode)"
} catch {
    Add-Result 'otlp-traces' $false $_.Exception.Message
}

# 5) Negative: protobuf to /metrics
try {
    $bytes = [byte[]](1,2,3,4,5)
    $resp = Invoke-WebRequest `
        -Method POST `
        -Uri "$ApiBaseUrl/api/v1/ingest/otlp/metrics" `
        -Body $bytes `
        -ContentType 'application/x-protobuf' `
        -SkipCertificateCheck `
        -SkipHttpErrorCheck
    Add-Result 'reject-protobuf-metrics' ($resp.StatusCode -eq 415) "Status $($resp.StatusCode) (expected 415)"
} catch {
    Add-Result 'reject-protobuf-metrics' $false $_.Exception.Message
}

# 6) Negative: malformed JSON
try {
    $resp = Invoke-WebRequest `
        -Method POST `
        -Uri "$ApiBaseUrl/api/v1/ingest/events" `
        -Body '{not-json' `
        -ContentType 'application/json' `
        -SkipCertificateCheck `
        -SkipHttpErrorCheck
    Add-Result 'reject-malformed-json' ($resp.StatusCode -eq 400) "Status $($resp.StatusCode) (expected 400)"
} catch {
    Add-Result 'reject-malformed-json' $false $_.Exception.Message
}

# Wait then query for persistence
Write-Host ""
Write-Host "Waiting $WaitSeconds s for ingestion worker to drain..." -ForegroundColor Cyan
Start-Sleep -Seconds $WaitSeconds

$queryStart = ([DateTimeOffset]::UtcNow.AddMinutes(-15)).ToString('o')
$queryEnd   = ([DateTimeOffset]::UtcNow.AddMinutes(1)).ToString('o')
$qsLogs    = "startTime=$([uri]::EscapeDataString($queryStart))&endTime=$([uri]::EscapeDataString($queryEnd))&limit=50"
$qsMetrics = "startTime=$([uri]::EscapeDataString($queryStart))&endTime=$([uri]::EscapeDataString($queryEnd))&limit=50"

try {
    $logs = Invoke-WebRequest `
        -Method GET `
        -Uri "$ApiBaseUrl/api/v1/Telemetry/logs?$qsLogs" `
        -SkipCertificateCheck `
        -SkipHttpErrorCheck
    Add-Result 'query-logs' ($logs.StatusCode -eq 200) "Status $($logs.StatusCode), bytes=$($logs.Content.Length)"
} catch {
    Add-Result 'query-logs' $false $_.Exception.Message
}

try {
    $metrics = Invoke-WebRequest `
        -Method GET `
        -Uri "$ApiBaseUrl/api/v1/Telemetry/metrics?$qsMetrics" `
        -SkipCertificateCheck `
        -SkipHttpErrorCheck
    Add-Result 'query-metrics' ($metrics.StatusCode -eq 200) "Status $($metrics.StatusCode), bytes=$($metrics.Content.Length)"
} catch {
    Add-Result 'query-metrics' $false $_.Exception.Message
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$failed = ($results | Where-Object { -not $_.Pass }).Count
if ($failed -gt 0) {
    Write-Host "$failed test(s) failed." -ForegroundColor Red
    exit 1
}

Write-Host "All ingestion smoke checks passed." -ForegroundColor Green
exit 0
