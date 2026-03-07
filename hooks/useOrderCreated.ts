"use client";

import { useEffect, useRef } from "react";
import { getSocket, joinBranchRoom, type OrderCreatedPayload } from "@/lib/socket";

const EVENT = "order:created";

export interface UseOrderCreatedOptions {
  /** لو مرّرته، الفرونت ينضم لغرفة الفرع (branch:${branchId}) ويستقبل طلبات الفرع فقط. */
  branchId?: string | null;
}

/**
 * استمع لحدث order:created من الباكند.
 * استخدمه في Client Components فقط ("use client").
 */
export function useOrderCreated(
  onOrderCreated: (data: OrderCreatedPayload) => void,
  options: UseOrderCreatedOptions = {}
) {
  const { branchId } = options;
  const callbackRef = useRef(onOrderCreated);
  callbackRef.current = onOrderCreated;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (branchId) {
      joinBranchRoom(branchId);
    }

    const handler = (data: OrderCreatedPayload) => {
      callbackRef.current(data);
    };

    socket.on(EVENT, handler);
    return () => {
      socket.off(EVENT, handler);
    };
  }, [branchId]);
}
