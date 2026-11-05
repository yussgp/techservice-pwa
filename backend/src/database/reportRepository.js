/**
 * Repositorio de reportes. Toda la persistencia SQL vive aquí.
 * La API expone camelCase; la base utiliza snake_case.
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
    @id, @folio, @technicianName, @clientName, @clientPhone, @location,
    @serviceType, @equipment, @problemDescription, @diagnosis, @workPerformed,
    @materials, @priority, @status, @notes, @createdAt, @updatedAt,
    @serverUpdatedAt, @syncedAt
  )
`;

const UPDATE_SQL = `
  UPDATE reports SET
    technician_name = @technicianName,
    client_name = @clientName,
    client_phone = @clientPhone,
    location = @location,
    service_type = @serviceType,
    equipment = @equipment,
    problem_description = @problemDescription,
    diagnosis = @diagnosis,
    work_performed = @workPerformed,
    materials = @materials,
    priority = @priority,
    status = @status,
    notes = @notes,
    updated_at = @updatedAt,
    server_updated_at = @serverUpdatedAt
  WHERE id = @id
`;

export function createReportRepository(db) {
  const findByIdStmt = db.prepare('SELECT * FROM reports WHERE id = ?');
  const findByFolioStmt = db.prepare('SELECT * FROM reports WHERE folio = ?');
  const insertStmt = db.prepare(INSERT_SQL);
  const updateStmt = db.prepare(UPDATE_SQL);
  const deleteStmt = db.prepare('DELETE FROM reports WHERE id = ?');
  const countStmt = db.prepare('SELECT COUNT(*) AS total FROM reports');

  const now = () => new Date().toISOString();

  return {
    findById(id) {
      return rowToReport(findByIdStmt.get(id));
    },

    findByFolio(folio) {
      return rowToReport(findByFolioStmt.get(folio));
    },

    insert(report) {
      const timestamp = now();
      insertStmt.run({
        ...report,
        serverUpdatedAt: timestamp,
        syncedAt: timestamp
      });
      return rowToReport(findByIdStmt.get(report.id));
    },

    update(report) {
      updateStmt.run({
        ...report,
        serverUpdatedAt: now()
      });
      return rowToReport(findByIdStmt.get(report.id));
    },

    remove(id) {
      return deleteStmt.run(id).changes > 0;
    },

    /**
     * Lista con filtros opcionales. Devuelve items + total (antes de paginar).
     */
    list({ search, serviceType, priority, status, limit = 200, offset = 0 } = {}) {
      const clauses = [];
      const params = {};

      if (search) {
        clauses.push(
          '(folio LIKE @search OR client_name LIKE @search OR technician_name LIKE @search OR equipment LIKE @search)'
        );
        params.search = `%${search}%`;
      }
      if (serviceType) {
        clauses.push('service_type = @serviceType');
        params.serviceType = serviceType;
      }
      if (priority) {
        clauses.push('priority = @priority');
        params.priority = priority;
      }
      if (status) {
        clauses.push('status = @status');
        params.status = status;
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const total = db
        .prepare(`SELECT COUNT(*) AS total FROM reports ${where}`)
        .get(params).total;

      const items = db
        .prepare(
          `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
        )
        .all({ ...params, limit, offset })
        .map(rowToReport);

      return { items, total };
    },

    count() {
      return countStmt.get().total;
    }
  };
}
