# cv_analysis/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional


class Education(BaseModel):
    degree: str
    institution: str
    year: Optional[str] = None


class Experience(BaseModel):
    job_title: str
    company: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class CVData(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    education: List[Education] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)


class MatchAnalysis(BaseModel):
    match_percentage: float
    strengths: List[str]
    gaps: List[str]
    recommended_skills: List[str]
    improvement_suggestions: List[str]



