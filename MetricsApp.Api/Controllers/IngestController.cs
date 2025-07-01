using MetricsApp.Abstractions.Queue;
using MetricsApp.Api.Models;
using MetricsApp.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetricsApp.Api.Controllers;

// [ApiController]
// [Route("api/v1/[controller]")]
// public class IngestController : ControllerBase
// {
//     private readonly IMessageQueueProducer<EventDto> _queueProducer;
//     private readonly ILogger<IngestController> _logger;
//
//     public IngestController(IMessageQueueProducer<EventDto> queueProducer, ILogger<IngestController> logger)
//     {
//         _queueProducer = queueProducer;
//         _logger = logger;
//     }
//
//     [HttpPost]
//     [ProducesResponseType(typeof(QueryApiSuccessResponse<IngestApiResponse>), StatusCodes.Status202Accepted)]
//     [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status400BadRequest)]
//     [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
//     public async Task<IActionResult> Post([FromBody] IngestApiRequest ingestRequest)
//     {
//         if (ingestRequest == null || ingestRequest.Events == null || !ingestRequest.Events.Any())
//         {
//              _logger.LogWarning("Ingest request is null or has no events.");
//             return BadRequest(new QueryApiErrorResponse("Request body must contain a non-empty 'events' array.", "InvalidInput"));
//         }
//
//         _logger.LogInformation("Received {Count} events for ingestion.", ingestRequest.Events.Count);
//
//         try
//         {
//             await _queueProducer.EnqueueBatchAsync(ingestRequest.Events, HttpContext.RequestAborted);
//             _logger.LogInformation("Successfully enqueued {Count} events.", ingestRequest.Events.Count);
//
//             var responseData = new IngestApiResponse
//             {
//                 RequestId = Guid.NewGuid().ToString(),
//                 Status = "Events accepted and queued for processing.",
//                 ReceivedEventCount = ingestRequest.Events.Count
//             };
//             return Accepted(new QueryApiSuccessResponse<IngestApiResponse>(responseData));
//         }
//         catch (System.Exception ex)
//         {
//             _logger.LogError(ex, "Error enqueuing events.");
//             return StatusCode(StatusCodes.Status500InternalServerError, 
//                               new QueryApiErrorResponse("An error occurred while queueing events.", "InternalServerError", ex.Message));
//         }
//     }
// }

[ApiController]
[Route("api/v1/ingest")]
public class IngestController : ControllerBase
{
    private readonly IEventRepository _eventRepository;
    private readonly IEnumerable<IEventParser> _parsers;

    public IngestController(IEventRepository eventRepository, IEnumerable<IEventParser> parsers)
    {
        _eventRepository = eventRepository;
        _parsers = parsers;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] List<EventDto> events)
    {
        // Optionally: parse/validate events, dispatch to parsers, etc.
        await _eventRepository.StoreEventsAsync(events, HttpContext.RequestAborted);
        return Accepted();
    }
}