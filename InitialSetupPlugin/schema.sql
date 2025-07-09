CREATE TABLE [dbo].[Logs](
    [timestamp] [datetime] NOT NULL,
    [level] [nvarchar](max) NULL,
    [message] [nvarchar](max) NULL,
    [source] [nvarchar](max) NULL
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
    GO

CREATE TABLE [dbo].[Metrics](
    [timestamp] [datetime] NOT NULL,
    [value] [float] NOT NULL
) ON [PRIMARY]
    GO
