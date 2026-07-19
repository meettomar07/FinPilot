from app.schemas.common import AppBaseModel

class UserSettingsResponse(AppBaseModel):
    weekly_summary: bool
    spending_alerts: bool
    goal_alerts: bool
    ai_digest: bool

class UserSettingsUpdateRequest(AppBaseModel):
    weekly_summary: bool
    spending_alerts: bool
    goal_alerts: bool
    ai_digest: bool
