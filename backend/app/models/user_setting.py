from sqlalchemy import Column, String
from app.models.base import Base

class UserSetting(Base):
    __tablename__ = "user_settings"

    user_id = Column(String, primary_key=True, index=True)
    notification_preferences = Column(String, default="{}", nullable=False)
