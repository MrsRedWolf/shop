from pydantic import BaseModel, Field
from typing import Optional, List

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None

class ProductCreate(BaseModel):
    title: str
    category: str
    price: float
    oldPrice: Optional[float] = None
    description: str
    tags: List[str] = []
    isNew: bool = False
    isPopular: bool = False
    sizes: List[str] = []
    images: List[str] = []

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    oldPrice: Optional[float] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    isNew: Optional[bool] = None
    isPopular: Optional[bool] = None
    sizes: Optional[List[str]] = None

class CartItemCreate(BaseModel):
    product_id: int
    qty: int = 1
    size: str = "One Size"

class AddressCreate(BaseModel):
    label: Optional[str] = None
    address: str
    isDefault: bool = False

class PaymentMethodCreate(BaseModel):
    last4: str
    brand: str
    expiry: str

class CartItemUpdate(BaseModel):
    qty: int
    size: str = "One Size"

class CategoryCreate(BaseModel):
    name: str

class CategoryOut(BaseModel):
    id: int
    name: str

class NewsCreate(BaseModel):
    title: str
    subtitle: str
    description: str
    link1_url: Optional[str] = None
    link1_text: Optional[str] = None
    link2_url: Optional[str] = None
    link2_text: Optional[str] = None
    date: Optional[str] = None
    order: int = 0

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    link1_url: Optional[str] = None
    link1_text: Optional[str] = None
    link2_url: Optional[str] = None
    link2_text: Optional[str] = None
    date: Optional[str] = None
    order: Optional[int] = None

class ReviewCreate(BaseModel):
    rating: int
    text: str

class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    author: str
    rating: int
    text: str
    date: str
    class Config:
        from_attributes = True