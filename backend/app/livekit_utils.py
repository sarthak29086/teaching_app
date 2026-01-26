
import os
from datetime import timedelta
from livekit import api
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "secret")

def create_livekit_token(
    room_name: str, 
    participant_identity: str, 
    participant_name: str
) -> str:
    """
    Create a LiveKit access token for a participant.
    """
    grant = api.VideoGrants(
        room_join=True,
        room=room_name,
    )
    
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
        .with_identity(participant_identity) \
        .with_name(participant_name) \
        .with_grants(grant) \
        .with_ttl(timedelta(hours=24))
        
    return token.to_jwt()
