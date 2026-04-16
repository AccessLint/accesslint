import React from "react";
import * as managerApi from "storybook/manager-api";
import { styled } from "storybook/theming";
import { ADDON_ID, PARAM_KEY, STATUS_TYPE_ID, RESULT_EVENT } from "./constants";
import { Panel } from "./Panel";

const { addons, types, useChannel, useStorybookApi } = managerApi;

const PANEL_ID = `${ADDON_ID}/panel`;
const TEST_PROVIDER_ID = `${ADDON_ID}/test-provider`;

// --- Storybook 10+ feature detection ---
// These APIs only exist in Storybook 10+. We feature-detect at the module
// level so the addon degrades gracefully to panel-only mode on Storybook 9.
const _getStatusStore = (managerApi as any).experimental_getStatusStore;
const _getTestProviderStore = (managerApi as any).experimental_getTestProviderStore;
const _useTestProviderStore: ((selector: (state: any) => any) => any) | null =
  (managerApi as any).experimental_useTestProviderStore ?? null;
const hasTestProvider = !!(_getStatusStore && _getTestProviderStore);

const statusStore = hasTestProvider ? _getStatusStore(STATUS_TYPE_ID) : null;
const testProviderStore = hasTestProvider ? _getTestProviderStore(TEST_PROVIDER_ID) : null;

if (testProviderStore && statusStore) {
  // Clear sidebar dots when the global "Clear All" button is pressed
  testProviderStore.onClearAll(() => {
    statusStore.unset();
  });
}

// ActionList and Form only exist in Storybook 10+
declare const require: (id: string) => any;
let ActionList: any = null;
let Form: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const components = require("storybook/internal/components");
  ActionList = components.ActionList ?? null;
  Form = components.Form ?? null;
} catch {
  // Storybook 9 — ActionList/Form not available
}

const Title = () => {
  const [count, setCount] = React.useState(0);

  useChannel({
    [RESULT_EVENT]: ({ result }: { result: { violations?: unknown[]; skipped?: boolean } }) => {
      setCount(result.skipped ? 0 : result.violations?.length ?? 0);
    },
  });

  return (
    <>
      AccessLint{count > 0 && <span style={{
        display: "inline-block",
        marginLeft: "8px",
        minWidth: "18px",
        padding: "0 5px",
        lineHeight: "18px",
        borderRadius: "9px",
        fontSize: "11px",
        fontWeight: "bold",
        textAlign: "center",
        background: "currentColor",
        color: "inherit",
      }}><span style={{ color: "#fff" }}>{count}</span></span>}
    </>
  );
};

type StatusType = "positive" | "negative" | "unknown";

const StyledActionList = ActionList
  ? styled(ActionList)({ padding: 0 })
  : styled.div({ padding: 0 });

const StatusDot = styled.div<{ status: StatusType }>(
  {
    width: 6,
    height: 6,
    margin: 4,
    borderRadius: "50%",
    background: "var(--status-color)",
  },
  ({ status, theme }) =>
    status === "positive" && {
      "--status-color": theme.color.positive,
    },
  ({ status, theme }) =>
    status === "negative" && {
      "--status-color": theme.color.negative,
    },
  ({ status, theme }) =>
    status === "unknown" && {
      "--status-color": theme.textMutedColor,
    },
);

interface ViolationReport {
  violations?: Array<{ ruleId: string; message: string }>;
}

const TestProviderWidget = () => {
  const [violationCount, setViolationCount] = React.useState<number | null>(null);
  const api = useStorybookApi();

  const providerState = _useTestProviderStore
    ? _useTestProviderStore((state: any) => state[TEST_PROVIDER_ID])
    : null;

  React.useEffect(() => {
    // Open the AccessLint panel when a sidebar status dot is clicked
    if (!statusStore) return;
    const unsub = statusStore.onSelect(() => {
      api.setSelectedPanel(PANEL_ID);
      api.togglePanel(true);
    });
    return unsub;
  }, [api]);

  useChannel({
    [RESULT_EVENT]: ({ storyId, result, status }: {
      storyId?: string;
      result: ViolationReport & { skipped?: boolean };
      status?: string;
    }) => {
      const violations = result.skipped ? [] : result.violations ?? [];
      setViolationCount(violations.length);

      // Update the status store for per-story sidebar dots (SB 10+ only)
      if (statusStore && storyId) {
        const hasViolations = violations.length > 0;
        const isWarning = status === "warning";

        statusStore.set([{
          value: result.skipped
            ? "status-value:unknown"
            : hasViolations
              ? isWarning ? "status-value:warning" : "status-value:error"
              : "status-value:success",
          typeId: STATUS_TYPE_ID,
          storyId,
          title: "AccessLint",
          description: result.skipped
            ? "Skipped"
            : hasViolations
              ? `${violations.length} violation${violations.length === 1 ? "" : "s"}`
              : "No violations",
          sidebarContextMenu: true,
        }]);
      }

      // Mark the test provider as succeeded after processing (SB 10+ only)
      if (testProviderStore && providerState === "test-provider-state:running") {
        testProviderStore.setState("test-provider-state:succeeded");
      }
    },
  });

  const hasViolations = violationCount !== null && violationCount > 0;
  const status: StatusType =
    violationCount === null ? "unknown" : hasViolations ? "negative" : "positive";

  const openPanel = () => {
    api.setSelectedPanel(PANEL_ID);
    api.togglePanel(true);
  };

  // Storybook 10+: use ActionList components
  if (ActionList && Form) {
    return (
      <StyledActionList>
        <ActionList.Item>
          <ActionList.Action as="label" readOnly>
            <ActionList.Icon>
              <Form.Checkbox name="AccessLint" checked disabled />
            </ActionList.Icon>
            <ActionList.Text>AccessLint</ActionList.Text>
          </ActionList.Action>
          <ActionList.Button
            ariaLabel={
              violationCount === null
                ? "AccessLint: not run yet"
                : hasViolations
                  ? `AccessLint: ${violationCount} violation${violationCount === 1 ? "" : "s"}`
                  : "AccessLint: no violations"
            }
            disabled={violationCount === null}
            onClick={openPanel}
          >
            {hasViolations ? violationCount : null}
            <StatusDot status={status} />
          </ActionList.Button>
        </ActionList.Item>
      </StyledActionList>
    );
  }

  // Storybook 9 fallback: simple styled widget
  return (
    <StyledActionList
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer" }}
      onClick={openPanel}
    >
      <StatusDot status={status} />
      <span style={{ fontSize: 12 }}>AccessLint</span>
      {hasViolations && (
        <span style={{ fontSize: 11, fontWeight: "bold" }}>{violationCount}</span>
      )}
    </StyledActionList>
  );
};

// --- Sidebar context menu (SB 10+ only, requires ActionList) ---
const SidebarContextMenu = ({ context }: { context: { id: string; type: string } }) => {
  const api = useStorybookApi();

  if (context.type !== "story" || !ActionList) return null;

  return (
    <ActionList.Item
      onClick={() => {
        api.selectStory(context.id);
        api.setSelectedPanel(PANEL_ID);
        api.togglePanel(true);
      }}
    >
      <ActionList.Text>View AccessLint results</ActionList.Text>
    </ActionList.Item>
  );
};

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    title: Title,
    type: types.PANEL,
    render: Panel,
    paramKey: PARAM_KEY,
  });

  // Test provider widget — only register on Storybook 10+ where the API exists
  if (hasTestProvider && (types as Record<string, unknown>).experimental_TEST_PROVIDER) {
    addons.add(TEST_PROVIDER_ID, {
      type: (types as Record<string, unknown>).experimental_TEST_PROVIDER as any,
      render: () => <TestProviderWidget />,
      sidebarContextMenu: ({ context }: { context: { id: string; type: string } }) => (
        <SidebarContextMenu context={context} />
      ),
    });
  }
});
