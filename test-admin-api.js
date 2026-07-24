const API_URL = 'http://localhost:3000/api/admin/v1';
const API_KEY = 'test-secret-key';

async function testApi() {
  console.log("=== Probando la Admin API (Formato Nexus) ===\n");

  // 1. Probar Health (/ops/health)
  console.log("1. Llamando a /ops/health...");
  try {
    const healthRes = await fetch(`${API_URL}/ops/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    const healthData = await healthRes.json();
    console.log("Status:", healthRes.status);
    console.log("Respuesta:", healthData, "\n");
  } catch (e) {
    console.log("Error en /ops/health:", e.message, "\n");
  }

  // 2. Probar Users (/users)
  console.log("2. Llamando a /users...");
  let firstUserId = null;
  try {
    const wsRes = await fetch(`${API_URL}/users`, {
      headers: { 'X-API-Key': API_KEY }
    });
    const usersData = await wsRes.json();
    console.log("Status:", wsRes.status);
    console.log("Usuarios encontrados:", usersData.length || 0);
    if (usersData && usersData.length > 0) {
      firstUserId = usersData[0].id;
      console.log("Primer Usuario ID:", firstUserId);
    }
    console.log("\n");
  } catch (e) {
    console.log("Error en /users:", e.message, "\n");
  }

  // 3. Probar Suspender cuenta (/users/[id]/suspend)
  if (firstUserId) {
    console.log(`3. Suspendiendo Usuario ${firstUserId}...`);
    try {
      const suspendRes = await fetch(`${API_URL}/users/${firstUserId}/suspend`, {
        method: 'POST',
        headers: { 
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      const suspendData = await suspendRes.json();
      console.log("Status:", suspendRes.status);
      console.log("Respuesta:", suspendData, "\n");
    } catch (e) {
      console.log("Error al suspender:", e.message, "\n");
    }
  } else {
    console.log("3. Saltando suspensión (no hay usuarios creados).");
  }
}

testApi();
