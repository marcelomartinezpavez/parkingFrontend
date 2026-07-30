
import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [pendingEntryTicket, setPendingEntryTicket] = useState(null);
  const [pendingExitTicket, setPendingExitTicket] = useState(null);
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
      setPendingEntryTicket(null);
      setPendingExitTicket(null);
      const res = await enter(plateIn);
      if (res.status === 200) {
        const data = res.data;
        const patente = data?.patente || plateIn;
        const fechaIngreso = data?.fechaIngreso || new Date().toISOString();
        setMsgEnter(`Vehículo ${patente} ingresado correctamente`);
        setMsgEnterType('success');
        setTimeout(() => {
          setMsgEnter(null);
        }, 10000); // 10 segundos

        setPendingEntryTicket({ patente, fechaIngreso, valorMinuto: state.ratePerMinute });
        showSnackbar(`Vehículo ingresado`)
        setPlateIn('');

        const occRes = await occupancy();
        const occData = occRes?.data;
        if (Array.isArray(occData) && occData.length > 0) {
          const firstItem = occData[0];
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
      setPendingExitTicket(null);
      setPendingEntryTicket(null);
      const res = await exit(plateOut);

      if (res.status === 200  && res.data?.id) {
        const minutos = res.data.minutosEstacionado;
        const total = res.data.valorTotal;
        setMsgExit(`Salida ${plateOut} registrada. Estacionado ${minutos} minutos. Total a pagar: $${total}. Realiza el pago.`);
        setMsgExitType('success');
        showSnackbar(`Salida ${plateOut} registrada. Estacionado ${minutos} minutos. Total a pagar: $${total}. Realiza el pago.`);
        setPendingExitTicket({
          patente: res.data.patente || plateOut,
          fechaIngreso: res.data.fechaIngreso,
          fechaSalida: res.data.fechaSalida,
          minutos,
          valorMinuto: state.ratePerMinute,
          total
        });
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

const printTicket = (patente, fechaIngreso, valorMinuto) => {
  const fecha = new Date(fechaIngreso);
  const fechaStr = fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const win = window.open('', '_blank', 'width=320,height=480');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket de Ingreso</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 280px; padding: 16px; font-size: 13px; }
    .center { text-align: center; }
    .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { font-size: 11px; margin-bottom: 12px; color: #555; }
    hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .label { font-weight: bold; }
    .patente { font-size: 22px; font-weight: bold; letter-spacing: 3px; text-align: center; margin: 10px 0; border: 2px solid #000; padding: 6px; }
    .footer { font-size: 10px; text-align: center; margin-top: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">ESTACIONAMIENTO</div>
    <div class="subtitle">TICKET DE INGRESO</div>
  </div>
  <hr>
  <div class="patente">${patente}</div>
  <hr>
  <div class="row"><span class="label">Fecha:</span><span>${fechaStr}</span></div>
  <div class="row"><span class="label">Hora ingreso:</span><span>${horaStr}</span></div>
  <div class="row"><span class="label">Valor por minuto:</span><span>$${valorMinuto}</span></div>
  <hr>
  <div class="footer">Conserve este ticket<br>Gracias por su preferencia</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 250);
};

const printExitTicket = (patente, fechaIngreso, fechaSalida, minutos, valorMinuto, total) => {
  const fmtFecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtHora = (iso) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const win = window.open('', '_blank', 'width=320,height=560');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket de Salida</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 280px; padding: 16px; font-size: 13px; }
    .center { text-align: center; }
    .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { font-size: 11px; margin-bottom: 12px; color: #555; }
    hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .label { font-weight: bold; }
    .patente { font-size: 22px; font-weight: bold; letter-spacing: 3px; text-align: center; margin: 10px 0; border: 2px solid #000; padding: 6px; }
    .total { font-size: 18px; font-weight: bold; text-align: center; margin: 10px 0; }
    .footer { font-size: 10px; text-align: center; margin-top: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">ESTACIONAMIENTO</div>
    <div class="subtitle">TICKET DE SALIDA</div>
  </div>
  <hr>
  <div class="patente">${patente}</div>
  <hr>
  <div class="row"><span class="label">Fecha ingreso:</span><span>${fmtFecha(fechaIngreso)}</span></div>
  <div class="row"><span class="label">Hora ingreso:</span><span>${fmtHora(fechaIngreso)}</span></div>
  <div class="row"><span class="label">Fecha salida:</span><span>${fmtFecha(fechaSalida)}</span></div>
  <div class="row"><span class="label">Hora salida:</span><span>${fmtHora(fechaSalida)}</span></div>
  <hr>
  <div class="row"><span class="label">Tiempo:</span><span>${minutos} minutos</span></div>
  <div class="row"><span class="label">Valor por minuto:</span><span>$${valorMinuto}</span></div>
  <hr>
  <div class="total">TOTAL: $${total}</div>
  <hr>
  <div class="footer">Gracias por su preferencia</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 250);
};

  return (
    <div className='center-card'>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, background:'#4a5568', borderRadius:12, padding:'14px 20px' }}>
        <div style={{ fontSize:22, fontWeight:800, color:'white', letterSpacing:1 }}>🅿 Estacionamiento</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ color:'#e2e8f0', fontSize:14, fontFamily:'monospace' }}>👤 admin</span>
          <button className='button' style={{ background:'#e74c3c', color:'white', fontWeight:700 }} onClick={()=>{ logout(); nav('/login') }}>Cerrar sesión</button>
        </div>
      </div>
      <div className='dashboard-hero'>
        <div style={{textAlign:'center', fontSize:22, fontWeight:700}}>El valor por minuto es: ${state.ratePerMinute ?? 0}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Pie used={occ.inCount} total={occ.capacity} />
          <div className='pie-center'>{occ.inCount} ocupados de {occ.capacity}</div>
        </div>
        <div className='row' style={{ justifyContent: 'center', width: '100%' }}>
        <div className='panel mint panel-fixed'>
          <div style={{fontSize:26, fontWeight:800, marginBottom:10}}>Ingresar vehículo <span style={{display:'inline-block', transform:'scaleX(-1)'}}>🚗</span>➡</div>
          <input className='input' placeholder='Patente' value={plateIn} onChange={e=>setPlateIn(e.target.value.toUpperCase())} />
          <div style={{marginTop:10}}><button className='button' onClick={handleEnter}>Ingresar</button></div>
          {msgEnter && (
            <div className={`card ${msgEnterType === 'success' ? 'success' : 'error'}`} style={{ marginTop: 10 }}>
              <strong>Estado:</strong> {msgEnter}
            </div>
          )}
          {pendingEntryTicket && (
            <div style={{ marginTop: 10 }}>
              <button className='button' onClick={() => printTicket(pendingEntryTicket.patente, pendingEntryTicket.fechaIngreso, pendingEntryTicket.valorMinuto)}>
                🖨 Imprimir ticket de entrada
              </button>
            </div>
          )}

        </div>
        <div className='panel peach panel-fixed'>
          <div style={{fontSize:26, fontWeight:800, marginBottom:10}}>Sacar vehículo 🚗<span style={{display:'inline-block', transform:'scaleX(-1)'}}>➡</span></div>
          <input className='input' placeholder='Patente' value={plateOut} onChange={e=>setPlateOut(e.target.value.toUpperCase())} />
          <div style={{marginTop:10}}><button className='button' onClick={handleExit}>Sacar vehículo</button></div>
          {pendingPaymentId && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Seleccionar método de pago:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className='button' onClick={() => handlePaymentType('EFECTIVO')}>💵 Efectivo</button>
                <button className='button' onClick={() => handlePaymentType('DEBITO')}>🏦 Débito</button>
                <button className='button' onClick={() => handlePaymentType('CREDITO')}>💳 Crédito</button>
              </div>
            </div>
          )}
          {pendingExitTicket && (
            <div style={{ marginTop: 10 }}>
              <button className='button' onClick={() => printExitTicket(pendingExitTicket.patente, pendingExitTicket.fechaIngreso, pendingExitTicket.fechaSalida, pendingExitTicket.minutos, pendingExitTicket.valorMinuto, pendingExitTicket.total)}>
                🖨 Imprimir ticket de salida
              </button>
            </div>
          )}
          {msgExit && (
            <div className={`card ${msgExitType === 'success' ? 'success' : 'error'}`} style={{ marginTop: 10 }}>
              <strong>Estado:</strong> {msgExit}
            </div>
          )}

        </div>
        </div>
        <div className='panel sand' style={{ gridColumn:'1/4', display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button className='button' style={{ fontSize:15, padding:'14px 28px', background:'#4a5568', color:'white', fontWeight:700, borderRadius:12, display:'flex', alignItems:'center', gap:8 }} onClick={() => nav('/historial')}>
            📋 Historial estacionados
          </button>
        </div>
      </div>
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={handleSnackClose}>
        <Alert onClose={handleSnackClose} severity={snackSeverity} sx={{ width: '100%' }}>
          {snackMsg}
        </Alert>
      </Snackbar>
      {/*      
      // Dentro del return de tu componente
      <div style={{ marginTop: 20 }}>
        <PrinterButton />
      </div>
      */}
    </div>
    
  )
}
