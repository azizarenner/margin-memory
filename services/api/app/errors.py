"""Safe public errors; never expose raw provider messages."""
class ProviderError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)

ERROR_MESSAGES = {
    "not_configured": "Your word is saved. Configure an OpenAI API key on the server to get an explanation.",
    "authentication": "Your word is saved. The server's OpenAI key was not accepted; check its configuration.",
    "access": "Your word is saved. This OpenAI project cannot access the configured model.",
    "quota": "Your word is saved. Check your OpenAI API billing or usage limit before retrying.",
    "rate_limit": "Your word is saved. OpenAI is temporarily rate-limiting requests; try again shortly.",
    "timeout": "Your word is saved. The explanation took too long; please try again.",
    "refused": "Your word is saved. OpenAI declined this explanation. Try a new capture with clearer vocabulary context.",
    "invalid_output": "Your word is saved. The explanation did not pass validation; please retry.",
    "unavailable": "Your word is saved. Its explanation is temporarily unavailable; please retry.",
}
