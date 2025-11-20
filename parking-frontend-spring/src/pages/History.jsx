import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { list, del } from '../api.js';

export default function History() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [resumen, setResumen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  const paginatedRows = rows.slice(
  (currentPage - 1) * rowsPerPage,
  currentPage * rowsPerPage
);

const totalPages = Math.ceil(rows.length / rowsPerPage);


  const loadData = () => {
    list(from, to, query).then(({resumen, filtrados}) => {
      setResumen(resumen);
      setRows(filtrados);
    });
  };

  useEffect(() => {
    loadData();
  }, [from, to, query]);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getBadgeColor = (status) => {
  switch (status) {
    case 'BORRADO':
      return 'red';
    case 'SALIDA':
      return 'yellow-green';
    case 'COBRADO':
      return 'green';
    case 'ESTACIONADO':
      return 'orange';
    default:
      return 'gray';
  }
};

const getBadgeLabel = (v) => {
  switch (v.status) {
    case 'BORRADO':
      return 'Borrado';
    case 'SALIDA':
      return `Salida - $${v.paid} - ${v.method }`;
    case 'COBRADO':
      return `Cobrado - $${v.paid} - ${v.method }`;
    case 'ESTACIONADO':
      return 'Estacionado';
    default:
      return 'Desconocido';
  }
};

  const row = (v) => {
    const minutes = v.outAt
      ? Math.max(1, Math.ceil((new Date(v.outAt) - new Date(v.inAt)) / 60000))
      : null;

    const isExpanded = expanded[v.id];
    const isLoading = loadingId === v.id;

    return (
      <React.Fragment key={v.id}>
        <tr onClick={() => toggleExpand(v.id)} style={{ cursor: 'pointer' }}>
          <td>{isExpanded ? '➖' : '➕'} {v.plate}</td>
          <td>
            <span className={`badge ${getBadgeColor(v.status)}`}>
              {getBadgeLabel(v)}
            </span>
          </td>
          <td>{format(new Date(v.inAt), 'dd-MM-yyyy HH:mm:ss')}</td>
          
          <td>
            <button
              className='button'
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                if (!window.confirm(`¿Estás seguro de borrar la patente ${v.plate}?`)) return;

                setLoadingId(v.id);
                del(v.plate).then(result => {
                  setLoadingId(null);
                  if (result.success) {
                    setSuccessMsg(`✅ Patente ${v.plate} borrada correctamente`);
                    loadData();
                    setTimeout(() => setSuccessMsg(''), 3000);
                  } else {
                    alert('Error al borrar: ' + result.message);
                  }
                });
              }}
            >
              {isLoading ? '⏳ Borrando...' : '🗑 Borrar'}
            </button>


          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan='8'>
              <div style={{ padding: 10 }}>
                <div>Fecha Ingreso: {format(new Date(v.inAt), 'dd-MM-yyyy, HH:mm:ss')}</div>
                <div>Fecha Salida: {v.outAt ? format(new Date(v.outAt), 'dd-MM-yyyy, HH:mm:ss') : '-'}</div>
                <div>Minutos estacionado: {minutes ?? '-'}</div>
                <div>Valor Total: ${v.paid ?? 0}</div>
                <div>Tipo de pago: {v.method || '-'}</div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className='center-card'>
      <h1>Estacionados</h1>
      <div className='filter-bar'>
        <div>Desde: <input type='date' value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div>Hasta: <input type='date' value={to} onChange={e => setTo(e.target.value)} /></div>
        <div className='row'>
          <input
            className='input'
            style={{ width: 220 }}
            placeholder='Buscar patente'
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>
      {successMsg && (
        <div className='card success' style={{ marginBottom: 10 }}>
          {successMsg}
        </div>
      )}

      <details open>
  <summary><strong>Resumen financiero ({from} - {to})</strong></summary>
  {resumen ? (
    <div className='summary-cards'>
      <div className='card-summary card-total'>
        💰 Total Recaudado<br />
        ${resumen.totalRecaudado.toLocaleString()}<br />
        ({resumen.totalTransacciones} transacciones)
      </div>
      <div className='card-summary card-tarjeta'>
        💳 Total Tarjeta<br />
        ${resumen.totalTarjeta.toLocaleString()}<br />
        ({resumen.transaccionesTarjeta} transacciones)
      </div>
      <div className='card-summary card-debito'>
        🏦 Débito<br />
        ${resumen.totalDebito.toLocaleString()}<br />
        ({resumen.transaccionesDebito} transacciones)
      </div>
      <div className='card-summary card-credito'>
        💳 Crédito<br />
        ${resumen.totalCredito.toLocaleString()}<br />
        ({resumen.transaccionesCredito} transacciones)
      </div>
      <div className='card-summary card-efectivo'>
        💵 Efectivo<br />
        ${(resumen.totalRecaudado - resumen.totalTarjeta).toLocaleString()}<br />
        ({resumen.transaccionesEfectivo} transacciones)
      </div>
    </div>
  ) : (
    <p>Cargando resumen...</p>
  )}
</details>


      <div className='card'>
        <div className='row'>
  <label htmlFor='rowsPerPage'>Mostrar:</label>
  <select
    id='rowsPerPage'
    value={rowsPerPage}
    onChange={e => {
      setRowsPerPage(Number(e.target.value));
      setCurrentPage(1); // Reinicia a la primera página
    }}
    style={{ marginLeft: 8 }}
  >
    <option value={5}>5</option>
    <option value={10}>10</option>
    <option value={20}>20</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
  </select>
  <span style={{ marginLeft: 8 }}>por página</span>
</div>

        <div className='pagination'>
          <button
            className='button'
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ⬅ Anterior
          </button>
          <span style={{ margin: '0 10px' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            className='button'
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Siguiente ➡
          </button>
        </div>

        <table className='table'>
          <thead>
            <tr>
              <th></th>
              <th>Estado</th>
              <th>Fecha ingreso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map(row)}
          </tbody>

        </table>
      </div>
      <div className='footer'>
        <a className='link' href='/'>&larr; Volver</a>
      </div>
    </div>
  );
}