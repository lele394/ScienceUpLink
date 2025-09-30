# --- Module Metadata ---
NAME = "Spacer"
DESCRIPTION = "A dummy module for the spacer widget. Does nothing."
VERSION = "1.0"

"""No state is needed for this module.
It's just how it works. dummy placeholder for spacing out other widgets."""

def handle(endpoint: dict) -> dict:
    """
    This is a dummy endpoint. It immediately returns an empty dictionary
    because the spacer widget requires no data.
    """
    return {"ok": True}