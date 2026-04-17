import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type AdminEventType = "stock-mutated" | "review-approved" | "memory-approved";

interface AdminEventContextType {
  publish: (event: AdminEventType) => void;
  subscribe: (event: AdminEventType, callback: () => void) => () => void;
}

const AdminEventContext = createContext<AdminEventContextType | null>(null);

export function AdminEventProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef(new Map<AdminEventType, Set<() => void>>());

  const subscribe = useCallback(
    (event: AdminEventType, callback: () => void) => {
      const map = listenersRef.current;
      if (!map.has(event)) {
        map.set(event, new Set());
      }
      map.get(event)!.add(callback);
      return () => {
        map.get(event)?.delete(callback);
      };
    },
    []
  );

  const publish = useCallback((event: AdminEventType) => {
    listenersRef.current.get(event)?.forEach((cb) => cb());
  }, []);

  return (
    <AdminEventContext.Provider value={{ publish, subscribe }}>
      {children}
    </AdminEventContext.Provider>
  );
}

export function useAdminEventContext() {
  const context = useContext(AdminEventContext);
  if (!context) {
    throw new Error(
      "useAdminEventContext must be used within an AdminEventProvider"
    );
  }
  return context;
}

export function useAdminEvent(event: AdminEventType, callback: () => void) {
  const { subscribe } = useAdminEventContext();

  useEffect(() => {
    return subscribe(event, callback);
  }, [event, callback, subscribe]);
}
