from pydantic import BaseModel, EmailStr, Field


class StaffLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class StaffMeOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    capabilities: list[str]
    default_dashboard: str


class StaffLoginOut(BaseModel):
    staff: StaffMeOut
