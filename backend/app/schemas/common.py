from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


class Message(BaseModel):
    detail: str