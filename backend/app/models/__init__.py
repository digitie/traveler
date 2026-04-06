from app.models.user import User
from app.models.weather import WeatherForecast, RestAreaWeather
from app.models.travel_plan import TravelPlan, TravelPlanSpot
from app.models.tourism import TouristSpot, TouristRestaurant, TouristAccommodation
from app.models.notification import TelegramNotificationLog

__all__ = [
    "User",
    "WeatherForecast",
    "RestAreaWeather",
    "TravelPlan",
    "TravelPlanSpot",
    "TouristSpot",
    "TouristRestaurant",
    "TouristAccommodation",
    "TelegramNotificationLog",
]
