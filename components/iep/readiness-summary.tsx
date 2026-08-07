import { LAYERS } from "@/lib/ai/framework";
import { READINESS_STYLES, LAYER_STATUS_STYLES, SEVERITY_STYLES } from "@/lib/severity-styles";
import type { IepReadiness, ReviewLayer, LayerStatus, FlagSeverity } from "@/app/generated/prisma/client";

interface LayerFindingData {
  layer: ReviewLayer;
  status: LayerStatus;
  severity: FlagSeverity | null;
  evidenceNote: string | null;
}

interface Props {
  readiness: IepReadiness | null;
  findings: LayerFindingData[];
}

export function ReadinessSummary({ readiness, findings }: Props) {
  if (!readiness) return null;

  const findingByLayer = new Map(findings.map((f) => [f.layer, f]));
  const readinessStyle = READINESS_STYLES[readiness];

  return (
    <div className="paper p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Overall Readiness</h2>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${readinessStyle.badge}`}>
          {readinessStyle.label}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 font-medium">Layer</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Severity</th>
              <th className="pb-2 font-medium">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {LAYERS.map(({ key, name }) => {
              const finding = findingByLayer.get(key);
              const statusStyle = finding ? LAYER_STATUS_STYLES[finding.status] : null;
              const severityStyle = finding?.severity ? SEVERITY_STYLES[finding.severity] : null;
              return (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">{name}</td>
                  <td className="py-2 pr-3">
                    {statusStyle && (
                      <span className={`px-2 py-0.5 rounded-full font-medium ${statusStyle.badge}`}>
                        {statusStyle.label}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {severityStyle && (
                      <span className={`px-2 py-0.5 rounded-full font-medium ${severityStyle.badge}`}>
                        {severityStyle.label}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground">{finding?.evidenceNote ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
