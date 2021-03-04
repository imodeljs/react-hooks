/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import React, { useEffect } from "react";

type CancellationFunc = () => void;

/** a wrapper over React's useEffect that facilitates good practice for async effects,
 * you can inline the async code, check if the effect is stale, and set a custom
 * cancellation function to be invoked on cleanup, which is useful for cancelling
 * actions such as fetch requests with AbortController, or axios requests with CancelToken
 *
 * The cancel function is assumed to be the cleanup action so if you need more advanced
 * cleanup or your dependencies include things upon which you shouldn't cancel, use a raw effect
 *
 * It will return a promise forwarding any result of the async effect you passed, so you
 * can catch the result of the effect to catch errors in the effect itself. You should not await this
 * (your component render can't be an async function anyway)
 * @example
 * useAsyncEffect(
 *   async () => { throw Error("boom!") }
 * ).catch((boom) => {})
 *
 * @example
 * useAsyncEffect(async ({setCanceller}) => {
 *   const req = axios.get<Resp>(url, {
 *     cancelToken: new axios.CancelToken(setCanceller) // works well with axios
 *   });
 *   await req;
 * }, [url]);
 *
 * @example
 * const [myArray, setMyArray] = useState([]);
 * useAsyncEffect(async ({isStale}) => {
 *   const result = await somethingAsync(id);
 *   if (!isStale()) setMyArray(result);
 * }, [id, somethingAsync]);
 *
 */
// HACK: overloading was defaulting always to the void return overload,
// so had to use generics to do this
export function useAsyncEffect<T extends Promise<void> | void>(
  effect: (util: {
    isStale: () => boolean;
    /** @deprecated perfer setCanceller, the name is more intuitive */
    setCancel: (cancel: CancellationFunc) => void;
    setCanceller: (cancel: CancellationFunc) => void;
  }) => T,
  deps?: React.DependencyList
): T extends Promise<void> ? Promise<void> : void {
  // it *always* returns a promise, but the promise can be safely ignored
  // if the passed effect wasn't async, so I hide from typescript that it is returned
  return new Promise<void>((resolve, reject) =>
    // Promise constructor synchronously invokes this callback,
    // so this useEffect call follows the rules of hooks (static invocation)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      let isStale = false;
      let onCancel: CancellationFunc | undefined;
      const setCanceller = (inCancelFunc: CancellationFunc) => {
        onCancel = inCancelFunc;
      };
      const result = effect({
        isStale: () => isStale,
        setCanceller,
        setCancel: setCanceller,
      });
      const isPromise = (a: any): a is Promise<void> => a !== undefined;
      if (isPromise(result)) {
        result
          .then(() => {
            onCancel = undefined;
            resolve();
          })
          .catch(reject);
      } else {
        resolve();
      }
      return () => {
        isStale = true;
        onCancel?.();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  ) as any;
}

export default useAsyncEffect;
