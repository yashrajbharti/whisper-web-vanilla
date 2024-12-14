// Main script: Decode the audio in the main thread
const worker = new Worker("./worker.js", { type: "module" });

// UI Elements
const inputFile = document.getElementById("audioFile");
const transcribeButton = document.getElementById("transcribe");
const outputText = document.getElementById("output");

// State Management
let isBusy = false;

// Handle messages from the worker
worker.onmessage = (event) => {
  const { status, data } = event.data;

  switch (status) {
    case "update":
      updateTranscript(data.text);
      break;

    case "complete":
      finalizeTranscript(data.text);
      setBusy(false);
      break;

    case "error":
      alert(data.message);
      setBusy(false);
      break;
    case "initiate":
      break;
    case "progress":
      break;
    case "done":
      break;
    case "ready":
      break;
    case "download":
      break;
    default:
      console.error("Unknown message status:", status);
  }
};

// Update the output transcript
const updateTranscript = (text) => {
  outputText.value = text;
};

// Finalize the transcription process
const finalizeTranscript = (text) => {
  outputText.value = text;
  console.log(text);
  alert("Transcription complete!");
};

// Manage the "busy" state
const setBusy = (state) => {
  isBusy = state;
  transcribeButton.disabled = state;
};

// Handle the transcribe button click
transcribeButton.addEventListener("click", () => {
  if (isBusy) return;

  const audioFile = inputFile.files[0];
  if (!audioFile) {
    alert("Please select an audio file first!");
    return;
  }

  setBusy(true);

  const fileReader = new FileReader();
  fileReader.onload = () => {
    const arrayBuffer = fileReader.result;
    decodeAudio(arrayBuffer);
  };
  fileReader.readAsArrayBuffer(audioFile);
});

// Decode the audio using AudioContext in the main thread
const decodeAudio = (arrayBuffer) => {
  const audioContext = new AudioContext({ sampleRate: 16000 });

  audioContext.decodeAudioData(
    arrayBuffer,
    (audioData) => {
      let audio;
      if (audioData.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);

        let left = audioData.getChannelData(0);
        let right = audioData.getChannelData(1);

        audio = new Float32Array(left.length);
        for (let i = 0; i < audioData.length; ++i) {
          audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
        }
      } else {
        // If the audio is not stereo, we can just use the first channel:
        audio = audioData.getChannelData(0);
      }
      const model = "Xenova/whisper-tiny";
      const multilingual = false;
      const quantized = false;
      const subtask = "transcribe";
      const language = "english";

      // Send the message to the worker with hardcoded values
      worker.postMessage({
        audio,
        model,
        multilingual,
        quantized,
        subtask: multilingual ? subtask : null,
        language: multilingual && language !== "auto" ? language : null,
      });
    },
    (error) => {
      alert("Error decoding audio: " + error.message);
      setBusy(false);
    }
  );
};
