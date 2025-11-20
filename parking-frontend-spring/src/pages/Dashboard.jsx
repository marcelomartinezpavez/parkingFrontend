
import React, { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { enter, config, occupancy, exit, logout, actualizarPago } from '../api.js'
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function Pie({ used, total }){
  const usedPct = Math.max(0, Math.min(1, total === 0 ? 0 : used/total));
  const r = 90, c = 2 * Math.PI * r;
  const dash = usedPct * c;
  const percentage = Math.round(usedPct * 100);

  return (
    <div>
      <div className='pie'>
        <svg viewBox='0 0 200 200'>
          <circle cx='100' cy='100' r='90' fill='none' stroke='#4169e1' strokeWidth='20' />
          <circle cx='100' cy='100' r='90' fill='none' stroke='#ffa500' strokeWidth='20' strokeDasharray={`${dash} ${c-dash}`} strokeDashoffset='0' transform='rotate(-90 100 100)' />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333'
          }}
        >
          {percentage}%
        </div>

      </div>
      <div className='legend' style={{justifyContent:'center', marginTop:8}}>
        <span className='dot free'/><small>Libres</small>
        <span className='dot busy'/><small>Ocupado</small>
      </div>
    </div>
  )
}

export default function Dashboard(){
  const [plateIn, setPlateIn] = useState('')
  const [plateOut, setPlateOut] = useState('')
  const [msgEnter, setMsgEnter] = useState('')
  const [msgExit, setMsgExit] = useState('')
  const [msgEnterType, setMsgEnterType] = useState('success'); // 'success' o 'error'
  const [msgExitType, setMsgExitType] = useState('success'); // 'success' o 'error'
  const nav = useNavigate()
  const [state, setState] = useState({ratePerMinute: 0});
  const [occ, setOcc] = useState({inCount:0, capacity:0});
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [pendingPlate, setPendingPlate] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState('success'); // 'error', 'info', 'warning'


  useEffect(() => {
    config().then(response => {
      const data = response?.data;

      // Validación: asegurarse de que data es un array no vacío
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];

        // Validación: asegurarse de que valorMinuto existe y es un número válido
        const valorMinuto = Number(firstItem?.valorMinuto);
        if (!isNaN(valorMinuto) && valorMinuto >= 0) {
          setState({ ratePerMinute: valorMinuto });
        } else {
          console.warn('valorMinuto inválido:', firstItem?.valorMinuto);
          setState({ ratePerMinute: 0 });
        }
      } else {
        console.warn('Respuesta de configuración vacía o inválida:', data);
        setState({ ratePerMinute: 0 });
      }
    })
    .catch(error => {
      console.error('Error al obtener configuración:', error);
      setState({ ratePerMinute: 0 });
    });

    occupancy()
    .then(response => {
      const data = response?.data;
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        const libres = Number(firstItem?.cantidadLibre);
        const ocupados = Number(firstItem?.cantidadOcupado);
        if (!isNaN(libres) && !isNaN(ocupados)) {
          setOcc({ inCount: ocupados, capacity: libres + ocupados });
        } else {
          console.warn('Datos de ocupación inválidos:', firstItem);
          setOcc({ inCount: 0, capacity: 0 });
        }
      } else {
        console.warn('Respuesta de ocupación vacía o inválida:', data);
        setOcc({ inCount: 0, capacity: 0 });
      }
    })
    .catch(error => {
      console.error('Error al obtener ocupación:', error);
      setOcc({ inCount: 0, capacity: 0 });
    });

  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackMsg(message);
    setSnackSeverity(severity);
    setSnackOpen(true);
  };
  const handleSnackClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackOpen(false);
  };

  const handleEnter = async () => {
    try {
      setMsgExit(null);
      const res = await enter(plateIn);
      if (res.status === 200) {
        setMsgEnter(res.data);
        setMsgEnterType('success');
        setTimeout(() => {
          setMsgEnter(null);
        }, 10000); // 10 segundos

        showSnackbar(`Vehículo ingresado`)
        setPlateIn('');

        const occRes = await occupancy();
        const data = occRes?.data;
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          const libres = Number(firstItem?.cantidadLibre);
          const ocupados = Number(firstItem?.cantidadOcupado);
          if (!isNaN(libres) && !isNaN(ocupados)) {
            setOcc({ inCount: ocupados, capacity: libres + ocupados });
          } else {
            setOcc({ inCount: 0, capacity: 0 });
          }
        } else {
          setOcc({ inCount: 0, capacity: 0 });
        }
      } else {
        const msg = res.data?.mensaje || "Ocurrió un error al registrar";
        setMsgEnter(msg);
        setMsgEnterType('error');
                setTimeout(() => {
          setMsgEnter(null);
        }, 10000); // 10 segundos

        showSnackbar(msg, 'error');
      }
    } catch (e) {
      const msg = e.response?.data.mensaje || "Ocurrió un error al registrar";
      setMsgEnter(msg);
      setMsgEnterType('error');
      setTimeout(() => {
        setMsgEnter(null);
      }, 10000); // 10 segundos

      showSnackbar(msg, 'error');
    }
  };

  const handleExit = async () => {
    try {
      setMsgEnter(null);
      const res = await exit(plateOut);
      
      if (res.status === 200  && res.data?.id) {
        const minutos = res.data.minutosEstacionado;
        const total = res.data.valorTotal;
        setMsgExit(`Salida ${plateOut} registrada. Estacionado ${minutos} minutos. Total a pagar: $${total}. Realiza el pago.`);
        setMsgExitType('success');
        showSnackbar(`Salida ${plateOut} registrada. Estacionado ${minutos} minutos. Total a pagar: $${total}. Realiza el pago.`);
        setPendingPaymentId(res.data.id);
        setPendingPlate(plateOut);
        // Actualizar ocupación después de sacar
        const occRes = await occupancy();
        const data = occRes?.data;
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          const libres = Number(firstItem?.cantidadLibre);
          const ocupados = Number(firstItem?.cantidadOcupado);
          if (!isNaN(libres) && !isNaN(ocupados)) {
            setOcc({ inCount: ocupados, capacity: libres + ocupados });
          } else {
            console.warn('Datos de ocupación inválidos:', firstItem);
            setOcc({ inCount: 0, capacity: 0 });
          }
        } else {
          console.warn('Respuesta de ocupación vacía o inválida:', data);
          setOcc({ inCount: 0, capacity: 0 });
        }
      } else {
        const msg = res.data?.mensaje || "Ocurrió un error al registrar salida";
        setMsgExit(msg);
        setMsgExitType('error');
        showSnackbar(msg, 'error');
      }
    } catch (e) {
      const msg = e.response?.data.mensaje || "Ocurrió un error al registrar salida";
      setMsgExit(msg);
      setMsgExitType('error');
      showSnackbar(msg, 'error');
    }
  };

  const handlePaymentType = async (type) => {
  try {
    setMsgEnter(null);
    const res = await actualizarPago(pendingPaymentId, type);

    if (res.status === 200) {
      setMsgExit(`Pago patente ${plateOut} registrado como ${type}`);
      setMsgExitType('success');
      setPendingPaymentId(null);
      setPendingPlate('');
      setPlateOut('');
    } else {
      setMsgExit("Error al registrar tipo de pago.");
      setMsgExitType('error');
    }
  } catch (e) {
    console.error("Error en tipo de pago:", e);
    setMsgExit(e.message);
    setMsgExitType('error');
  }
};

  return (
    <div className='center-card'>
      <div className='dashboard-hero'>
        <div style={{textAlign:'center', fontSize:22, fontWeight:700}}>El valor por minuto es: ${state.ratePerMinute ?? 0}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Pie used={occ.inCount} total={occ.capacity} />
          <div className='pie-center'>{occ.inCount} ocupados de {occ.capacity}</div>
        </div>
        <div className='row' style={{ justifyContent: 'center', width: '100%' }}>
        <div className='panel mint'>
          <div style={{fontSize:26, fontWeight:800, marginBottom:10}}>Ingresar vehículo</div>
          <input className='input' placeholder='Patente' value={plateIn} onChange={e=>setPlateIn(e.target.value.toUpperCase())} />
          <div style={{marginTop:10}}><button className='button' onClick={handleEnter}>Ingresar</button></div>
          {msgEnter && (
              <div
                className={`card ${msgEnterType === 'success' ? 'success' : 'error'}`}
                style={{ marginTop: 10 }}
              >

                <strong>Estado:</strong> {msgEnter}
              </div>
            )}

        </div>
        <div className='panel peach'>
          <div style={{fontSize:26, fontWeight:800, marginBottom:10}}>Sacar vehículo</div>
          <input className='input' placeholder='Patente' value={plateOut} onChange={e=>setPlateOut(e.target.value.toUpperCase())} />
          <div style={{marginTop:10}}><button className='button' onClick={handleExit}>Sacar vehículo</button></div>
          {pendingPaymentId && (
            <div style={{ marginTop: 10 }}>
              <div>Realizar pago:</div>
              <button className='button' onClick={() => handlePaymentType('EFECTIVO')}>Realizar el Pago</button>
              {/*<button className='button' onClick={() => handlePaymentType('DEBITO')}>Débito</button>
              <button className='button' onClick={() => handlePaymentType('CREDITO')}>Crédito</button>
              */}
            </div>
          )}
          {msgExit && (
              <div
                className={`card ${msgExitType === 'success' ? 'success' : 'error'}`}
                style={{ marginTop: 10 }}
              >
                <strong>Estado:</strong> {msgExit}
              </div>
            )}

        </div>
        </div>
        <div className='panel sand' style={{gridColumn:'1/4'}}>
          <div className='topbar'>
            <div><Link to='/historial' className='link'>Historial estacionados</Link></div>
            <div className='row'>
              <small className='mono'>Sesión: admin</small>
              <button className='button' onClick={()=>{ logout(); nav('/login') }}>Cerrar sesión</button>
            </div>
          </div>

          {/*msg && (
            <div className='card success' style={{ marginTop: 10 }}>
              <strong>Estado:</strong> {msg}
            </div>
          )*/}

        </div>
      </div>
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={handleSnackClose}>
        <Alert onClose={handleSnackClose} severity={snackSeverity} sx={{ width: '100%' }}>
          {snackMsg}
        </Alert>
      </Snackbar>

    </div>
  )
}
