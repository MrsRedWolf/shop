from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)  # в реальности хешировать
    name = Column(String)
    surname = Column(String)
    patronymic = Column(String)
    phone = Column(String)
    avatar = Column(Text, nullable=True)
    role = Column(String, default="user")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    category = Column(String)
    price = Column(Float)
    oldPrice = Column(Float, nullable=True)
    description = Column(Text)
    images = Column(JSON, default=[])
    tags = Column(JSON)         # ["Хит", "-24%"]
    isNew = Column(Boolean, default=False)
    isPopular = Column(Boolean, default=False)
    sizes = Column(JSON)        # ["XS", "S"]

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(String)
    total = Column(Float)
    status = Column(String, default="В обработке")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer)
    title = Column(String)
    qty = Column(Integer)
    size = Column(String)
    price = Column(Float)
    order = relationship("Order", back_populates="items")

class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer)

class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer)
    qty = Column(Integer)
    size = Column(String)

class Address(Base):
    __tablename__ = "addresses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    label = Column(String)
    address = Column(String)
    isDefault = Column(Boolean, default=False)

class PaymentMethod(Base):
    __tablename__ = "payment_methods"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    last4 = Column(String)
    brand = Column(String)
    expiry = Column(String)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

class News(Base):
    __tablename__ = "news"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=False)   # текст под заголовком (например, дата или категория)
    description = Column(Text, nullable=False)  # основной текст
    link1_url = Column(String, nullable=True)
    link1_text = Column(String, nullable=True)
    link2_url = Column(String, nullable=True)
    link2_text = Column(String, nullable=True)
    date = Column(String, nullable=True)        # отображаемая дата
    order = Column(Integer, default=0)          # порядок сортировки

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author = Column(String, nullable=False)  # имя пользователя
    rating = Column(Integer, nullable=False)  # 1–5
    text = Column(Text, nullable=False)
    date = Column(String, nullable=False)  # дата в строковом формате, как у вас принято