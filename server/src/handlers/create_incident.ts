import { db } from '../db';
import { incidentsTable, incidentAffectedComponentsTable } from '../db/schema';
import { type CreateIncidentInput, type Incident } from '../schema';

export const createIncident = async (input: CreateIncidentInput): Promise<Incident> => {
  try {
    // Insert incident record
    const incidentResult = await db.insert(incidentsTable)
      .values({
        status_page_id: input.status_page_id,
        title: input.title,
        description: input.description,
        status: input.status,
        created_by: input.created_by
      })
      .returning()
      .execute();

    const incident = incidentResult[0];

    // Create affected component relationships if any
    if (input.affected_component_ids && input.affected_component_ids.length > 0) {
      const affectedComponentValues = input.affected_component_ids.map(component_id => ({
        incident_id: incident.id,
        component_id
      }));

      await db.insert(incidentAffectedComponentsTable)
        .values(affectedComponentValues)
        .execute();
    }

    return incident;
  } catch (error) {
    console.error('Incident creation failed:', error);
    throw error;
  }
};