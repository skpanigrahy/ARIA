import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Link,
  Webhook,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  fetchIntegrationConfigs,
  fetchRecentWebhookEvents,
  updateIntegrationConfig,
} from "../lib/database";

interface IntegrationConfig {
  id: string;
  type: string;
  name: string;
  is_enabled: boolean;
  webhook_url?: string;
  last_event_at?: string;
  event_count?: number;
  config?: Record<string, unknown>;
}

interface WebhookEvent {
  id: string;
  source: string;
  event_type: string;
  received_at: string;
  payload?: Record<string, unknown>;
}

const INTEGRATION_META: Record<
  string,
  { color: string; description: string; docsUrl: string; fields: string[] }
> = {
  github: {
    color: "#E6EDF3",
    description:
      "Receive PR events from GitHub repositories. ARIA evaluates each PR and returns a decision.",
    docsUrl: "https://docs.github.com/en/webhooks",
    fields: ["Repository URL", "Branch filters", "PR event types"],
  },
  bitbucket: {
    color: "#2684FF",
    description:
      "Receive PR events from Bitbucket repositories for ARIA evaluation.",
    docsUrl:
      "https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/",
    fields: ["Workspace", "Repository slug", "PR event types"],
  },
  snyk: {
    color: "#4C4A73",
    description:
      "Receive Snyk vulnerability scan results. ARIA correlates findings with active PRs.",
    docsUrl:
      "https://docs.snyk.io/integrations/notifications-ticketing-system-integrations/webhooks",
    fields: ["Organization ID", "Scan event types"],
  },
  sonarqube: {
    color: "#4E9BCD",
    description:
      "Receive SonarQube quality gate results. ARIA updates risk scores on failure.",
    docsUrl:
      "https://docs.sonarsource.com/sonarqube/latest/project-administration/webhooks/",
    fields: ["Project key", "Quality gate conditions"],
  },
  raven: {
    color: "#F85149",
    description:
      "JPMC Raven policy engine. ARIA enforces policy violations as BLOCK decisions.",
    docsUrl: "#",
    fields: ["Policy set ID", "Violation severity threshold"],
  },
  servicenow: {
    color: "#81B5A1",
    description:
      "Receive ServiceNow incident events. Production incidents automatically reduce agent trust scores.",
    docsUrl:
      "https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/reference/r_IntegrationsIncidentMgt.html",
    fields: ["Instance URL", "Assignment group filter"],
  },
};

const SOURCE_LABELS: Record<string, string> = {
  github: "GitHub",
  bitbucket: "Bitbucket",
  snyk: "Snyk",
  sonarqube: "SonarQube",
  raven: "Raven",
  servicenow: "ServiceNow",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="w-7 h-7 rounded-lg hover:bg-[#30363D] flex items-center justify-center transition-colors flex-shrink-0"
      title="Copy webhook URL"
    >
      {copied ? (
        <Check size={13} className="text-[#3FB950]" />
      ) : (
        <Copy size={13} className="text-[#8B949E]" />
      )}
    </button>
  );
}

function IntegrationCard({
  config,
  onToggle,
}: {
  config: IntegrationConfig;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = INTEGRATION_META[config.type] ?? {
    color: "#8B949E",
    description: "",
    docsUrl: "#",
    fields: [],
  };

  const webhookUrl =
    config.webhook_url ??
    `${window.location.origin.replace(":5173", "")}/functions/v1/${config.type}-webhook`;
  const lastEvent = config.last_event_at
    ? new Date(config.last_event_at).toLocaleString()
    : "Never";

  return (
    <div
      className={`bg-[#161B22] border rounded-xl overflow-hidden transition-all duration-200 ${config.is_enabled ? "border-[#30363D]" : "border-[#21262D] opacity-70"}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border border-[#30363D]"
              style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
            >
              {config.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-[#E6EDF3] font-semibold text-sm">
                {config.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {config.is_enabled ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse" />
                    <span className="text-[#3FB950] text-[10px] font-medium">
                      Active
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#656D76]" />
                    <span className="text-[#656D76] text-[10px]">Inactive</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.is_enabled}
              onChange={() => onToggle(config.id, !config.is_enabled)}
            />
            <div className="w-9 h-5 bg-[#21262D] rounded-full peer peer-checked:bg-[#1F6FEB] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>

        <p className="text-[#8B949E] text-xs leading-relaxed mb-4">
          {meta.description}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#0D1117] rounded-lg p-3">
            <p className="text-[#656D76] text-[10px] uppercase tracking-wide mb-1">
              Events Received
            </p>
            <p className="text-[#E6EDF3] text-lg font-bold tabular-nums">
              {(config.event_count ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-[#0D1117] rounded-lg p-3">
            <p className="text-[#656D76] text-[10px] uppercase tracking-wide mb-1">
              Last Event
            </p>
            <p className="text-[#8B949E] text-xs font-medium">{lastEvent}</p>
          </div>
        </div>

        <div className="bg-[#0D1117] rounded-lg p-3 mb-3">
          <p className="text-[#656D76] text-[10px] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Webhook size={10} />
            Webhook URL
          </p>
          <div className="flex items-center gap-2">
            <code className="text-[#58A6FF] text-[10px] font-mono flex-1 truncate">
              {webhookUrl}
            </code>
            <CopyButton text={webhookUrl} />
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-[#8B949E] text-xs hover:text-[#E6EDF3] transition-colors py-1"
        >
          <span>Configuration details</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#21262D] pt-4">
          <p className="text-[#656D76] text-[10px] uppercase tracking-wide mb-3">
            Required Fields
          </p>
          <div className="space-y-2 mb-4">
            {meta.fields.map((field) => (
              <div key={field} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1F6FEB]" />
                <span className="text-[#8B949E] text-xs">{field}</span>
              </div>
            ))}
          </div>
          {meta.docsUrl !== "#" && (
            <a
              href={meta.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#58A6FF] text-xs hover:underline"
            >
              <Link size={11} />
              View integration docs
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function WebhookEventRow({ event }: { event: WebhookEvent }) {
  const isSuccess = true;
  const label = SOURCE_LABELS[event.source] ?? event.source;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#21262D] last:border-0">
      <div className="flex-shrink-0">
        {isSuccess ? (
          <CheckCircle size={14} className="text-[#3FB950]" />
        ) : (
          <XCircle size={14} className="text-[#F85149]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#E6EDF3] text-xs font-medium truncate">
          {event.event_type}
        </p>
        <p className="text-[#656D76] text-[10px]">{label}</p>
      </div>
      <div className="flex items-center gap-1.5 text-[#656D76] text-[10px] flex-shrink-0">
        <Clock size={10} />
        {new Date(event.received_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}

export default function Integrations() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [cfgData, evtData] = await Promise.all([
      fetchIntegrationConfigs(),
      fetchRecentWebhookEvents(15),
    ]);
    setConfigs(cfgData as IntegrationConfig[]);
    setEvents(evtData as WebhookEvent[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_enabled: enabled } : c)),
    );
    await updateIntegrationConfig(id, { is_enabled: enabled });
  };

  const activeCount = configs.filter((c) => c.is_enabled).length;
  const totalEvents = configs.reduce((s, c) => s + (c.event_count ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#656D76] text-sm animate-pulse">
          Loading integrations...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[#8B949E] text-sm">
          <span className="text-[#3FB950]">{activeCount} active</span> ·{" "}
          {configs.length - activeCount} inactive ·{" "}
          {totalEvents.toLocaleString()} total events
        </p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-[#161B22] border border-[#21262D] rounded-lg text-[#8B949E] text-xs hover:text-[#E6EDF3] hover:border-[#30363D] transition-colors"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {configs.length > 0
          ? configs.map((config) => (
              <IntegrationCard
                key={config.id}
                config={config}
                onToggle={handleToggle}
              />
            ))
          : FALLBACK_INTEGRATIONS.map((config) => (
              <IntegrationCard
                key={config.id}
                config={config}
                onToggle={() => {}}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#E6EDF3] font-semibold text-sm">
              Recent Webhook Events
            </h3>
            <span className="text-[#656D76] text-[10px]">Last 15 events</span>
          </div>
          {events.length > 0 ? (
            <div>
              {events.map((event) => (
                <WebhookEventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Webhook size={24} className="text-[#656D76] mx-auto mb-3" />
              <p className="text-[#8B949E] text-sm">No webhook events yet</p>
              <p className="text-[#656D76] text-xs mt-1">
                Events will appear here once integrations are configured
              </p>
            </div>
          )}
        </div>

        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
          <h3 className="text-[#E6EDF3] font-semibold text-sm mb-4">
            Integration Architecture
          </h3>
          <div className="space-y-3">
            {[
              {
                step: "1",
                label: "Source Event",
                desc: "GitHub PR opened / Snyk scan completes / ServiceNow incident created",
                color: "#58A6FF",
              },
              {
                step: "2",
                label: "Webhook Received",
                desc: "Supabase Edge Function receives and logs the event payload",
                color: "#E3B341",
              },
              {
                step: "3",
                label: "Signal Correlation",
                desc: "Events are matched to PRs using repo + PR number as correlation key",
                color: "#BC8CFF",
              },
              {
                step: "4",
                label: "ARIA Evaluation",
                desc: "aria-evaluate function runs risk scoring across all available signals",
                color: "#3FB950",
              },
              {
                step: "5",
                label: "Decision Stored",
                desc: "Decision written to Supabase and available in Decision Intelligence",
                color: "#58A6FF",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 items-start">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `${item.color}20`,
                    color: item.color,
                  }}
                >
                  {item.step}
                </div>
                <div>
                  <p className="text-[#E6EDF3] text-xs font-medium">
                    {item.label}
                  </p>
                  <p className="text-[#8B949E] text-[10px] leading-relaxed mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "int-github",
    type: "github",
    name: "GitHub",
    is_enabled: true,
    event_count: 0,
  },
  {
    id: "int-bitbucket",
    type: "bitbucket",
    name: "Bitbucket",
    is_enabled: false,
    event_count: 0,
  },
  {
    id: "int-snyk",
    type: "snyk",
    name: "Snyk",
    is_enabled: true,
    event_count: 0,
  },
  {
    id: "int-sonarqube",
    type: "sonarqube",
    name: "SonarQube",
    is_enabled: true,
    event_count: 0,
  },
  {
    id: "int-raven",
    type: "raven",
    name: "Raven",
    is_enabled: true,
    event_count: 0,
  },
  {
    id: "int-servicenow",
    type: "servicenow",
    name: "ServiceNow",
    is_enabled: false,
    event_count: 0,
  },
];
