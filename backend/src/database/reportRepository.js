/**
 * Repositorio de reportes. Toda la persistencia SQL vive aquí.
 * La API expone camelCase; la base utiliza snake_case.
 *
 * El cliente libSQL es asíncrono remotamente (Turso) y localmente. Cada método
 * acepta un ejecutor opcional (`client` o una transacción) para que el servicio
 * pueda agrupar operaciones de sincronización en una sola transacción.
 */

function rowToReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    folio: row.folio,
    technicianName: row.technician_name,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    location: row.location,
    serviceType: row.service_type,
    equipment: row.equipment,
    problemDescription: row.problem_description,
    diagnosis: row.diagnosis,
    workPerformed: row.work_performed,
    materials: row.materials,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serverUpdatedAt: row.server_updated_at,
    syncedAt: row.synced_at
  };
}

const INSERT_SQL = `
  INSERT INTO reports (
    id, folio, technician_name, client_name, client_phone, location,
    service_type, equipment, problem_description, diagnosis, work_performed,
    materials, priority, status, notes, created_at, updated_at,
    server_updated_at, synced_at
  ) VALUES (
    :id, :folio, :technicianName, :clientName, :clientPhone, :location,
    :serviceType, :equipment, :problemDescription, :diagnosis, :workPerformed,
    :materials, :priority, :status, :notes, :createdAt, :updatedAt,
    :serverUpdatedAt, :syncedAt
  )
`;

const UPDATE_SQL = `
  UPDATE reports SET
    technician_name = :technicianName,
    client_name = :clientName,
    client_phone = :clientPhone,
    location = :location,
    service_type = :serviceType,
    equipment = :equipment,
    problem_description = :problemDescription,
    diagnosis = :diagnosis,
    work_performed = :workPerformed,
    materials = :materials,
    priority = :priority,
    status = :status,
    notes = :notes,
    updated_at = :updatedAt,
    server_updated_at = :serverUpdatedAt
  WHERE id = :id
`;

export function createReportRepository(db) {
  const now = () => new Date().toISOString();

  async function findById(id, executor = db) {
    const result = await executor.execute({
      sql: 'SELECT * FROM reports WHERE id = ?',
      args: [id]
    });
    return rowToReport(result.rows[0]);
  }

  async function findByFolio(folio, executor = db) {
    const result = await executor.execute({
      sql: 'SELECT * FROM reports WHERE folio = ?',
      args: [folio]
    });
    return rowToReport(result.rows[0]);
  }

  async function insert(report, executor = db) {
    const timestamp = now();
    await executor.execute({
      sql: INSERT_SQL,
      args: {
        ...report,
        serverUpdatedAt: timestamp,
        syncedAt: timestamp
      }
    });
    return findById(report.id, executor);
  }

  async function update(report, executor = db) {
    await executor.execute({
      sql: UPDATE_SQL,
      args: {
        ...report,
        serverUpdatedAt: now()
      }
    });
    return findById(report.id, executor);
  }

  async function remove(id, executor = db) {
    const result = await executor.execute({
      sql: 'DELETE FROM reports WHERE id = ?',
      args: [id]
    });
    return result.rowsAffected > 0;
  }

  /**
   * Lista con filtros opcionales. Devuelve items + total (antes de paginar).
   */
  async function list(
    { search, serviceType, priority, status, limit = 200, offset = 0 } = {},
    executor = db
  ) {
    const clauses = [];
    const params = {};

    if (search) {
      clauses.push(
        '(folio LIKE :search OR client_name LIKE :search OR technician_name LIKE :search OR equipment LIKE :search)'
      );
      params.search = `%${search}%`;
    }
    if (serviceType) {
      clauses.push('service_type = :serviceType');
      params.serviceType = serviceType;
    }
    if (priority) {
      clauses.push('priority = :priority');
      params.priority = priority;
    }
    if (status) {
      clauses.push('status = :status');
      params.status = status;
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await executor.execute({
      sql: `SELECT COUNT(*) AS total FROM reports ${where}`,
      args: params
    });
    const total = Number(countResult.rows[0]?.total ?? 0);

    const itemsResult = await executor.execute({
      sql: `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
      args: { ...params, limit, offset }
    });

    return { items: itemsResult.rows.map(rowToReport), total };
  }

  async function count(executor = db) {
    const result = await executor.execute('SELECT COUNT(*) AS total FROM reports');
    return Number(result.rows[0]?.total ?? 0);
  }

  return { findById, findByFolio, insert, update, remove, list, count };
}
