export const maxDuration = 60;

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "TamilType's transcription service is not connected yet. The site owner needs to add the private OPENAI_API_KEY in Vercel." },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const audio = form.get("audio");
    if (!audio || typeof audio.arrayBuffer !== "function") {
      return Response.json({ error: "No audio recording was received. Please record again." }, { status: 400 });
    }
    if (audio.size < 1000) {
      return Response.json({ error: "The recording is too short. Please try again." }, { status: 400 });
    }
    if (audio.size > 4 * 1024 * 1024) {
      return Response.json({ error: "This recording is too large. Please record a shorter message (under one minute)." }, { status: 413 });
    }

    const mime = audio.type || "audio/mp4";
    const filename = audio.name || (mime.includes("webm") ? "recording.webm" : "recording.m4a");
    const payload = new FormData();
    payload.append("file", audio, filename);
    payload.append("model", "gpt-4o-mini-transcribe");
    payload.append("language", "ta");
    payload.append("response_format", "json");
    payload.append("prompt", "Transcribe the spoken Tamil exactly in Tamil script. Preserve the speaker's words and meaning. Do not translate into English. Add natural punctuation and spacing.");

    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey },
      body: payload
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Transcription provider error:", upstream.status, result?.error?.message || "Unknown error");
      return Response.json(
        { error: upstream.status === 401 ? "The transcription API key is invalid. Please contact the site owner." : "The AI transcription service could not process this recording. Please try again." },
        { status: upstream.status === 429 ? 429 : 502 }
      );
    }

    return Response.json({ text: result.text || "" }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Tamil transcription error:", error);
    return Response.json({ error: "Something went wrong while transcribing. Please try again." }, { status: 500 });
  }
}
