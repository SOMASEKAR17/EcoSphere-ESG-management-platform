from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class EmissionFactorCreate(BaseModel):
    activity_type: str
    factor_name: str
    factor_value: Decimal = Field(ge=0)
    unit: str


class EmissionFactorUpdate(BaseModel):
    factor_name: Optional[str] = None
    factor_value: Optional[Decimal] = Field(default=None, ge=0)
    unit: Optional[str] = None
    status: Optional[str] = None


class EmissionFactorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activity_type: str
    factor_name: str
    factor_value: Decimal
    unit: str
    status: str


class CarbonTransactionCreate(BaseModel):
    department_id: int
    source_type: str
    emission_factor_id: int
    operational_quantity: Decimal = Field(ge=0)
    source_record_id: Optional[int] = None


class CarbonTransactionAutoGenerate(BaseModel):
    department_id: int
    source_type: str
    emission_factor_id: int
    operational_quantity: Decimal = Field(ge=0)
    source_record_id: Optional[int] = None


class CarbonTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department_id: int
    source_type: str
    source_record_id: Optional[int] = None
    emission_factor_id: int
    operational_quantity: Decimal
    calculated_emission: Decimal
    logged_by: Optional[int] = None
    transaction_date: datetime


class EnvironmentalGoalCreate(BaseModel):
    title: str
    department_id: int
    target_metric: str
    target_value: Decimal
    current_value: Decimal = Decimal(0)
    deadline: date


class EnvironmentalGoalUpdate(BaseModel):
    title: Optional[str] = None
    target_metric: Optional[str] = None
    target_value: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    deadline: Optional[date] = None
    status: Optional[str] = None


class EnvironmentalGoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    department_id: int
    target_metric: str
    target_value: Decimal
    current_value: Decimal
    deadline: date
    status: str


class ProductEsgProfileCreate(BaseModel):
    product_sku: str
    product_name: str
    carbon_footprint_per_unit: Decimal = Field(ge=0)
    sustainability_rating: Optional[str] = None


class ProductEsgProfileUpdate(BaseModel):
    product_name: Optional[str] = None
    carbon_footprint_per_unit: Optional[Decimal] = Field(default=None, ge=0)
    sustainability_rating: Optional[str] = None
    status: Optional[str] = None


class ProductEsgProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_sku: str
    product_name: str
    carbon_footprint_per_unit: Decimal
    sustainability_rating: Optional[str] = None
    status: str