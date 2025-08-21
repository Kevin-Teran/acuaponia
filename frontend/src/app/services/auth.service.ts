const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * Llama al endpoint de login del backend.
 * @param credentials - Objeto con email y password.
 * @returns La respuesta del servidor con el token de acceso.
 * @throws Lanza un error si la respuesta no es exitosa.
 */
export async function login(credentials: { email: string; password: string }) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    // Si el servidor responde con un error (401, 400, etc.),
    // usamos el mensaje que viene de NestJS.
    throw new Error(data.message || 'Error en el inicio de sesión');
  }

  return data;
}
