
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    LiveKitRoom,
    VideoConference,
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    ControlBar,
    useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

// Get LiveKit URL from env or default to dev server
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "http://localhost:7880";

export default function Classroom() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { sessionId } = useParams();

    const [token, setToken] = useState(state?.livekit_token || "");

    // If we don't have a token (e.g. refresh), we should redirect back to course
    // In a full app, we would fetch the token again here
    useEffect(() => {
        if (!token) {
            alert("Missing class token. Please join from the course page.");
            navigate(-1);
        }
    }, [token, navigate]);

    if (!token) return <div className="text-white">Loading class...</div>;

    return (
        <div className="h-screen w-screen bg-neutral-900">
            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={LIVEKIT_URL}
                data-lk-theme="default"
                style={{ height: "100vh" }}
                onDisconnected={() => navigate(-1)}
            >
                {/* The VideoConference component provides the default UI */}
                <VideoConference />

                {/* 
          Alternatively, we can build a custom UI:
          <MyVideoLayout />
          <RoomAudioRenderer />
          <ControlBar /> 
        */}
            </LiveKitRoom>
        </div>
    );
}
