// src/utils/keepAlive.ts
// Este script reproduce un audio silencioso minúsculo de manera continua en bucle.
// El objetivo es engañar al navegador (Chrome/Edge/Safari) haciéndole creer que
// la pestaña está reproduciendo multimedia, lo que previene que la ponga en "reposo"
// o corte su conexión a internet (Firebase) cuando está en segundo plano o minimizada.

export function setupKeepAlive() {
  // Audio WAV completamente silencioso en formato base64
  const audioBlob = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  const audio = new Audio(audioBlob);
  audio.loop = true;
  audio.volume = 0; // Volumen en 0 por seguridad

  const unlockAudio = () => {
    audio.play().then(() => {
      console.log('Keep-alive activado: Pestaña protegida contra suspensión en segundo plano.');
      // Una vez que logramos reproducirlo, removemos los listeners para no saturar
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    }).catch(() => {
      // Si el navegador bloquea el autoplay, simplemente intentará de nuevo en el siguiente clic
    });
  };

  // Los navegadores modernos no permiten reproducir audio sin una interacción previa del usuario.
  // Escuchamos el primer clic o tecla presionada para iniciar el bucle silencioso.
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
}
