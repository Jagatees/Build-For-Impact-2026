// utils/audio-recorder.js
let mediaRecorder = null;
let audioChunks = [];

export const AudioRecorder = {
  start: async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', (event) => {
      audioChunks.push(event.data);
    });

    mediaRecorder.start();
  },

  stop: async () => {
    return new Promise((resolve) => {
      if (!mediaRecorder) return resolve(null);

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Chrome/Edge default
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result;
          resolve(base64String);
          
          // Stop all tracks to turn off the red recording dot
          mediaRecorder.stream.getTracks().forEach(t => t.stop());
          mediaRecorder = null;
        };
      });

      mediaRecorder.stop();
    });
  }
};