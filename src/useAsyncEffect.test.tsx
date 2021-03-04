/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import React from "react";
import { render } from "@testing-library/react";

import useAsyncEffect from "./useAsyncEffect";

type Equals<T, U> = T extends U ? (U extends T ? true : false) : false;

describe("useAsyncEffect()", () => {
  // type smoke tests
  it("can take async effects, returns promise", () => {
    const effect = jest.fn();
    let outerHookResult;
    function TestComp() {
      const hookResult = useAsyncEffect(async () => {
        effect();
      }).catch(console.error);
      const testTypeHookResult: Equals<typeof hookResult, Promise<void>> = true;
      outerHookResult = hookResult;
      return null;
    }
    render(<TestComp />);
    expect(outerHookResult).toHaveProperty("catch");
  });

  it("can take non-async effects, returns void", () => {
    const effect = jest.fn();
    let hookResult;
    function TestComp() {
      hookResult = useAsyncEffect(() => {
        effect();
      });
      const testTypeHookResult: Equals<typeof hookResult, void> = true;
      return null;
    }
    render(<TestComp />);
  });
});
