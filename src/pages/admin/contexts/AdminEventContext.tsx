/**
 * ملف: AdminEventContext.tsx
 * الدور: ناقل أحداث (event bus) خفيف خاص بلوحة التحكم يتيح التواصل بين الشاشات المتباعدة
 * دون تمرير دوال عبر سلسلة الخصائص (props). تنشر شاشةٌ حدثًا (publish) فتتفاعل شاشة أخرى
 * مشترِكة فيه (subscribe)؛ مثال: قبول طلب يبثّ "stock-mutated" فتعيد شاشة العطور تحميل المخزون.
 */
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// الأحداث المدعومة في النظام: تغيّر المخزون، الموافقة على مراجعة، الموافقة على ذكرى
type AdminEventType = "stock-mutated" | "review-approved" | "memory-approved";

interface AdminEventContextType {
  publish: (event: AdminEventType) => void;
  subscribe: (event: AdminEventType, callback: () => void) => () => void;
}

const AdminEventContext = createContext<AdminEventContextType | null>(null);

/**
 * مزوّد ناقل الأحداث. يخزّن المشتركين في مرجع (useRef) لا في الحالة، حتى لا يسبّب
 * تسجيل/إلغاء المشتركين أي إعادة تصيير للشجرة.
 */
export function AdminEventProvider({ children }: { children: ReactNode }) {
  // خريطة تربط كل نوع حدث بمجموعة من دوال الاستماع المسجّلة له
  const listenersRef = useRef(new Map<AdminEventType, Set<() => void>>());

  // تسجيل دالة استماع لحدث معيّن، وإرجاع دالة لإلغاء الاشتراك (تُستدعى عند تفكيك المكوّن)
  const subscribe = useCallback(
    (event: AdminEventType, callback: () => void) => {
      const map = listenersRef.current;
      if (!map.has(event)) {
        map.set(event, new Set());
      }
      map.get(event)!.add(callback);
      // دالة التنظيف: إزالة هذا المستمع تحديدًا من مجموعة الحدث
      return () => {
        map.get(event)?.delete(callback);
      };
    },
    []
  );

  // بثّ حدث: استدعاء جميع دوال الاستماع المسجّلة لذلك الحدث
  const publish = useCallback((event: AdminEventType) => {
    listenersRef.current.get(event)?.forEach((cb) => cb());
  }, []);

  return (
    <AdminEventContext.Provider value={{ publish, subscribe }}>
      {children}
    </AdminEventContext.Provider>
  );
}

/**
 * خطّاف للوصول إلى ناقل الأحداث (publish/subscribe).
 * يرمي خطأً واضحًا إذا استُخدم خارج AdminEventProvider لاكتشاف الخطأ مبكّرًا.
 */
export function useAdminEventContext() {
  const context = useContext(AdminEventContext);
  if (!context) {
    throw new Error(
      "useAdminEventContext must be used within an AdminEventProvider"
    );
  }
  return context;
}

/**
 * خطّاف توافقي يشترك في حدث محدّد ويُلغي الاشتراك تلقائيًا عند تفكيك المكوّن.
 * يبسّط نمط الاستخدام بحيث تكتفي الشاشة باستدعائه مرّرةً نوع الحدث ودالة التفاعل.
 */
export function useAdminEvent(event: AdminEventType, callback: () => void) {
  const { subscribe } = useAdminEventContext();

  // الاشتراك عند التركيب وإرجاع دالة إلغاء الاشتراك ليتولّى useEffect تنظيفها
  useEffect(() => {
    return subscribe(event, callback);
  }, [event, callback, subscribe]);
}
