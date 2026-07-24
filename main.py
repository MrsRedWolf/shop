from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from database import engine, get_db
from models import (Base, User, Product, 
                    Order, OrderItem, Favorite, 
                    CartItem, Address, PaymentMethod, 
                    Category, News, Review)
from schemas import (
    UserCreate, UserLogin, UserUpdate,
    ProductCreate, ProductUpdate,
    CartItemCreate, CartItemUpdate,
    AddressCreate, PaymentMethodCreate,
    CategoryCreate, NewsCreate, NewsUpdate,
    ReviewCreate
)
from auth import create_token, get_current_user
import bcrypt

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def index():
    return FileResponse("static/index.html")

@app.get("/cabinet")
def cabinet():
    return FileResponse("static/cabinet.html")

@app.get("/admin")
def admin():
    return FileResponse("static/admin.html")

# --- Аутентификация ---
@app.post("/api/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db_user = User(email=user.email, password=hashed, name=user.name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"access_token": create_token(int(db_user.id)), "user": db_user}

@app.post("/api/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not bcrypt.checkpw(credentials.password.encode('utf-8'), user.password.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")
    return {"access_token": create_token(int(user.id)), "user": user}

@app.get("/api/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/api/profile")
def update_profile(profile: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in profile.dict(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    return current_user

# --- Товары ---
@app.get("/api/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@app.get("/api/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return product

@app.put("/api/products/{product_id}")
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    return product

@app.post("/api/products")
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    db.delete(product)
    db.commit()
    return {"ok": True}

# --- Корзина ---
@app.get("/api/cart")
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    result = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
        result.append({
            "product_id": item.product_id,
            "qty": item.qty,
            "size": item.size,
            "price": product.price,
            "title": product.title,
            "image": product.images[0] if product.images else "",
            "sizes": product.sizes
        })
    return result

@app.post("/api/cart")
def add_to_cart(item: CartItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Проверяем существование товара
    product = db.query(Product).filter(Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == item.product_id,
        CartItem.size == item.size
    ).first()
    if existing:
        existing.qty = int(existing.qty) + item.qty
    else:
        cart_item = CartItem(user_id=current_user.id, **item.dict())
        db.add(cart_item)
    db.commit()
    return {"ok": True}

@app.put("/api/cart/{product_id}")
def update_cart_item(product_id: int, data: CartItemUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == product_id,
        CartItem.size == data.size
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Товар в корзине не найден")
    if data.qty <= 0:
        db.delete(item)
    else:
        item.qty = data.qty
    db.commit()
    return {"ok": True}

@app.delete("/api/cart/{product_id}")
def delete_cart_item(product_id: int, size: str = "One Size", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == product_id,
        CartItem.size == size
    ).first()
    if item:
        db.delete(item)
        db.commit()
    return {"ok": True}

# --- Избранное ---
@app.get("/api/favorites")
def get_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    return [f.product_id for f in favs]

@app.post("/api/favorites/{product_id}")
def toggle_favorite(product_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.product_id == product_id
    ).first()
    if fav:
        db.delete(fav)
        db.commit()
        return {"isFavorite": False}
    else:
        fav = Favorite(user_id=current_user.id, product_id=product_id)
        db.add(fav)
        db.commit()
        return {"isFavorite": True}

# --- Заказы ---
@app.post("/api/orders")
def create_order(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Корзина пуста")
    total = 0
    order = Order(user_id=current_user.id, date=date.today().isoformat(), total=0, status="В обработке")
    db.add(order)
    db.flush()
    for item in cart_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            db.delete(item)
            continue
        total += product.price * item.qty
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            title=product.title,
            qty=item.qty,
            size=item.size,
            price=product.price
        )
        db.add(order_item)
    if total == 0:
        raise HTTPException(status_code=400, detail="Нет доступных товаров в корзине")
    order.total = float(total)
    # Очищаем корзину
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()
    return {"order_id": order.id, "total": total}

@app.get("/api/orders")
def get_orders(current_user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Необходима авторизация")
    if current_user.role == "admin":
        orders = db.query(Order).all()
    else:
        orders = db.query(Order).filter(Order.user_id == current_user.id).all()
    result = []
    for order in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        result.append({
            "id": order.id,
            "date": order.date,
            "total": order.total,
            "status": order.status,
            "items": [
                {
                    "product_id": i.product_id,
                    "title": i.title,
                    "qty": i.qty,
                    "size": i.size,
                    "price": i.price
                } for i in items
            ]
        })
    return result

@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    order.status = str(status)
    db.commit()
    return {"ok": True}

# --- Адреса ---
@app.get("/api/addresses")
def get_addresses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Address).filter(Address.user_id == current_user.id).all()

@app.post("/api/addresses")
def create_address(addr: AddressCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(Address).filter(Address.user_id == current_user.id).first():
        addr.isDefault = bool(True)
    address = Address(user_id=current_user.id, **addr.dict())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address

@app.put("/api/addresses/{addr_id}")
def update_address(addr_id: int, addr: AddressCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    address = db.query(Address).filter(Address.id == addr_id, Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    for key, value in addr.dict(exclude_unset=True).items():
        setattr(address, key, value)
    db.commit()
    return address

@app.delete("/api/addresses/{addr_id}")
def delete_address(addr_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    address = db.query(Address).filter(Address.id == addr_id, Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    was_default = address.isDefault
    db.delete(address)
    if was_default:
        first = db.query(Address).filter(Address.user_id == current_user.id).first()
        if first:
            first.isDefault = bool(True)
    db.commit()
    return {"ok": True}

@app.put("/api/addresses/{addr_id}/default")
def set_default_address(addr_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Address).filter(Address.user_id == current_user.id).update({"isDefault": False})
    address = db.query(Address).filter(Address.id == addr_id, Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Адрес не найден")
    address.isDefault = bool(True)
    db.commit()
    return {"ok": True}

# --- Платёжные методы ---
@app.get("/api/payment-methods")
def get_payment_methods(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(PaymentMethod).filter(PaymentMethod.user_id == current_user.id).all()

@app.post("/api/payment-methods")
def create_payment_method(pm: PaymentMethodCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    method = PaymentMethod(user_id=current_user.id, **pm.dict())
    db.add(method)
    db.commit()
    db.refresh(method)
    return method

@app.delete("/api/payment-methods/{pm_id}")
def delete_payment_method(pm_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    method = db.query(PaymentMethod).filter(PaymentMethod.id == pm_id, PaymentMethod.user_id == current_user.id).first()
    if not method:
        raise HTTPException(status_code=404, detail="Метод оплаты не найден")
    db.delete(method)
    db.commit()
    return {"ok": True}

@app.get("/api/categories")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@app.post("/api/categories")
def create_category(cat: CategoryCreate, db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.name == cat.name).first():
        raise HTTPException(status_code=400, detail="Категория уже существует")
    category = Category(name=cat.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@app.delete("/api/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == cat_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    # запрещаем удаление, если есть товары этой категории
    if db.query(Product).filter(Product.category == category.name).first():
        raise HTTPException(status_code=400, detail="Нельзя удалить категорию с товарами")
    db.delete(category)
    db.commit()
    return {"ok": True}

@app.get("/api/news")
def get_news(db: Session = Depends(get_db)):
    return db.query(News).order_by(News.order).all()

@app.post("/api/news")
def create_news(data: NewsCreate, db: Session = Depends(get_db)):
    news = News(**data.dict())
    db.add(news)
    db.commit()
    db.refresh(news)
    return news

@app.put("/api/news/{news_id}")
def update_news(news_id: int, data: NewsUpdate, db: Session = Depends(get_db)):
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(news, key, value)
    db.commit()
    return news

@app.delete("/api/news/{news_id}")
def delete_news(news_id: int, db: Session = Depends(get_db)):
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    db.delete(news)
    db.commit()
    return {"ok": True}

# --- Отзывы ---
@app.get("/api/reviews/{product_id}")
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.product_id == product_id).all()

@app.post("/api/reviews")
def create_review(review: ReviewCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == review.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    new_review = Review(
        product_id=review.product_id,
        user_id=current_user.id,
        author=current_user.name,
        rating=review.rating,
        text=review.text,
        date=date.today().strftime("%d.%m.%Y")  # формат как у вас
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@app.post("/api/reviews/{product_id}")
def submit_review(product_id: int, review: ReviewCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Проверяем, не оставлял ли уже этот пользователь отзыв
    existing = db.query(Review).filter(
        Review.product_id == product_id,
        Review.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже оставили отзыв на этот товар")
    
    new_review = Review(
        product_id=product_id,
        user_id=current_user.id,
        author=current_user.name,
        rating=review.rating,
        text=review.text,
        date=date.today().strftime("%d.%m.%Y")
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

# --- Отзывы (админка) ---
@app.get("/api/admin/reviews")
def get_all_reviews(db: Session = Depends(get_db)):
    return db.query(Review).order_by(Review.id.desc()).all()

@app.delete("/api/admin/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Отзыв не найден")
    db.delete(review)
    db.commit()
    return {"ok": True}

# --- Пользователи (админка) ---
@app.get("/api/admin/users")
def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()

@app.put("/api/admin/users/{user_id}/role")
def toggle_user_role(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.role = "user" if user.role == "admin" else "admin"
    db.commit()
    return {"ok": True}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    db.delete(user)
    db.commit()
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, workers=1)