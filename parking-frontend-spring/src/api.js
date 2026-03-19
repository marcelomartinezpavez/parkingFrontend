import axios from 'axios';

//const API_BASE = import.meta.env.VITE_API_BASE || 'http://186.64.113.173:8080/api';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
//const API_URL = 'http://186.64.113.173:8080/api';
const API_URL = 'http://localhost:8080/api';
function getToken(){ return localStorage.getItem('token') || ''; }
function setToken(t){ localStorage.setItem('token', t); }
export function logout(){ localStorage.removeItem('token'); }

async function req(path, opts={}){
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type':'application/json', ...(getToken()?{'Authorization':'Bearer '+getToken()}:{}) },
    credentials:'include',
    ...opts
  });
  if (!res.ok){
    const msg = await res.text();
    throw new Error(msg || ('HTTP '+res.status));
  }
  const ct = res.headers.get('content-type')||'';
  return ct.includes('application/json') ? res.json() : res.text();
}

export async function login(username, password){
  try {
    const response = await axios.get(`${API_URL}/login/${username}/${password}`);
    const result = response.data;
    if (!result || !result.pass) {
      return null;
    }
    return result;
  } catch (error) {
    console.error("Error en login:", error);
    return null;
  }

}

export const enter = (plate) => axios.post(`${API_URL}/estacionados/ingresar`,{patente:plate}, {
      headers: {
        'Content-Type': 'application/json'
      }
    }
);
export const exit = (plate) => axios.post(`${API_URL}/estacionados/sacar`, {patente:plate},{
  headers: {
        'Content-Type': 'application/json'
      }
});

export const config = () => axios.get(`${API_URL}/configuraciones`,{
  headers: {
        'Content-Type': 'application/json'
      }
});

export const occupancy = () => axios.get(`${API_URL}/estacionamientos`,{
  headers: {
        'Content-Type': 'application/json'
      }
});

export const list = async (from, to, q = '') => {
  try {
    const response = await axios.get(`${API_URL}/estacionados/por-fecha`, {
      params: {
        from: `${from}T00:00:00`,
        to: `${to}T23:59:59`
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const resumen = response.data || [];
    const data = response.data.estacionados || [];
    const filtrados = data
      .filter(item =>
        (item.patente || '').toUpperCase().includes(q.toUpperCase())
      )
     .map(item => ({
        id: item.id,
        plate: item.patente,
        status: item.estado,
        inAt: item.fechaIngreso,
        outAt: item.fechaSalida,
        paid: item.valorTotal,
        method: item.tipoPago
      }));
      return{resumen, filtrados};
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return {resumen: null, filtrados: []};
  }
};

export const del = async (plate) => {
  try {
    const response = await axios.put(`${API_URL}/estacionados/borrar`, { patente: plate }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al borrar vehículo:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Error desconocido'
    };
  }
};

export const actualizarPago = async (id, tipoPago) =>
  axios.put(`${API_URL}/estacionados/actualizar-pago/${id}`, { tipoPago }, {
    headers: {
      'Content-Type': 'application/json'
    }
});

