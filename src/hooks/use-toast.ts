"use client"

/**
 * use-toast.ts — مخزن إشعارات التنبيه (toast) بدون واجهة (نمط shadcn/ui).
 *
 * يطبّق آلة حالة (state machine) عامة صغيرة للتنبيهات بدون استخدام React Context:
 * توجد حالة على مستوى الوحدة اسمها `memoryState` يتم تعديلها عبر reducer، وكل
 * مكوّن مركّب يستخدم `useToast()` يشترك عبر مصفوفة `listeners` بحيث يُعاد رسم كل
 * المستهلكين عند إضافة/تحديث/إزالة تنبيه. لذلك يمكن استدعاء دالة `toast()` من أي
 * مكان (حتى خارج React) لإظهار تنبيه.
 *
 * ملاحظة: يعتمد المشروع أساساً على toaster الخاص بمكتبة `sonner` للواجهة؛ هذا
 * الملف هو بدائية toast الأساسية من shadcn المحفوظة للمكوّنات التي تعتمد عليها.
 */

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// إظهار تنبيه واحد فقط في كل مرة؛ التنبيه الجديد يحل محل السابق.
const TOAST_LIMIT = 1
// المدة التي يبقى فيها التنبيه المُغلق في الحالة قبل إزالته (عملياً "لا يُزال
// تلقائياً" هنا — الإزالة تتم عبر إغلاق صريح بدلاً من ذلك).
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

/** يولّد معرّفاً نصياً فريداً ومتزايداً لكل تنبيه (يلتفّ بأمان عند MAX_SAFE_INTEGER). */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

// يتتبع مؤقّتات الإزالة المعلّقة لكل معرّف تنبيه حتى لا نضع التنبيه نفسه في
// طابور الإزالة مرتين.
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/** يجدول إزالة التنبيه بالكامل من الحالة بعد مرور TOAST_REMOVE_DELAY. */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
 * reducer نقي يحوّل الحالة الحالية للتنبيهات + إجراء (action) إلى الحالة التالية.
 * @param state الحالة الحالية للتنبيهات.
 * @param action واحد من ADD/UPDATE/DISMISS/REMOVE_TOAST.
 * @returns الحالة التالية للتنبيهات.
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// دوال setState المشتركة من كل مستهلك مركّب يستخدم useToast().
const listeners: Array<(state: State) => void> = []

// المصدر الوحيد للحقيقة، محفوظ على مستوى الوحدة (خارج React).
let memoryState: State = { toasts: [] }

/** يمرر الإجراء عبر reducer ثم يُخطر كل مستهلك مشترك. */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

/**
 * يُظهر تنبيهاً بشكل إجرائي من أي مكان (داخل React أو خارجه).
 * @param props محتوى/خصائص التنبيه بدون المعرّف المُولَّد تلقائياً.
 * @returns مقبض `{ id, dismiss, update }` للتحكم بهذا التنبيه تحديداً.
 */
function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * خطاف React لقراءة التنبيهات الحالية وإرسال إجراءات التنبيه.
 * @returns `{ ...toasts, toast, dismiss }` — الحالة الحالية بالإضافة إلى الدوال المساعدة الإجرائية.
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    // اشتراك دالة setState لهذا المكوّن في المخزن العام عند التركيب، وإلغاء
    // الاشتراك عند الإزالة لتجنّب التسريبات/التحديثات القديمة.
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
