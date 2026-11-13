class InputTokenLimited(Exception):
    """Raised when the input exceeds the allowed token limit."""

    def __init__(self, message: str = "Input exceeds the allowed token limit"):
        super().__init__(message)
