/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import React from "react";
import { render } from "@testing-library/react";
import { act } from "react-dom/test-utils";

import useAsyncInterval from "./useAsyncInterval";
import { ReactHookState } from "./react-type-utils";

const TINY_INTERVAL = 10;

describe("useAsyncInterval()", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("doesn't run on null interval", () => {
    let [interval]: ReactHookState<number | null> = [null, jest.fn()];
    const effect = jest.fn();
    function TestComp() {
      [interval] = React.useState<number | null>(null);
      void useAsyncInterval(() => {
        effect();
      }, interval);
      return null;
    }
    render(<TestComp />);

    jest.runAllTimers();

    expect(effect).toBeCalledTimes(0);
  });

  it("cleans up previous interval right before current", () => {
    const effect = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, TINY_INTERVAL * 2)); // wait enough to be cleaned up
    });
    const cancel = jest.fn(() => {
      // should not be called for first time
      expect(effect).toBeCalledTimes(1);
    });
    function TestComp() {
      void useAsyncInterval(async ({ setCanceller }) => {
        setCanceller(cancel);
        await effect();
      }, TINY_INTERVAL);
      return null;
    }
    render(<TestComp />);

    jest.advanceTimersByTime(TINY_INTERVAL - 1);

    expect(cancel).toBeCalledTimes(0);
    expect(effect).toBeCalledTimes(0);

    jest.advanceTimersByTime(1);

    expect(cancel).toBeCalledTimes(0);
    expect(effect).toBeCalledTimes(1);

    jest.advanceTimersByTime(TINY_INTERVAL);

    expect(cancel).toBeCalledTimes(1);
    expect(effect).toBeCalledTimes(2);
  });

  it("reruns forever unless null", () => {
    let [interval]: ReactHookState<number | null> = [TINY_INTERVAL, jest.fn()];
    const effect = jest.fn();
    function TestComp() {
      [interval] = React.useState<number | null>(TINY_INTERVAL);
      void useAsyncInterval(() => {
        effect();
      }, interval);
      return null;
    }
    render(<TestComp />);

    const EXPECTED_TIMES = 3;

    jest.advanceTimersByTime(EXPECTED_TIMES * TINY_INTERVAL);

    expect(effect).toBeCalledTimes(EXPECTED_TIMES);
  });

  it("stops running when interval becomes null", () => {
    let [interval, setInterval]: ReactHookState<number | null> = [
      TINY_INTERVAL,
      jest.fn(),
    ];
    const effect = jest.fn();
    function TestComp() {
      [interval, setInterval] = React.useState<number | null>(TINY_INTERVAL);
      void useAsyncInterval(() => {
        effect();
      }, interval);
      return null;
    }
    render(<TestComp />);

    jest.advanceTimersByTime(TINY_INTERVAL);

    expect(effect).toBeCalledTimes(1);

    act(() => setInterval(null));
    effect.mockClear();

    jest.advanceTimersByTime(TINY_INTERVAL);

    expect(effect).not.toBeCalled();
  });

  it("restarts running when interval becomes non-null", () => {
    let [interval, setInterval]: ReactHookState<number | null> = [
      null,
      jest.fn(),
    ];
    const effect = jest.fn();
    function TestComp() {
      [interval, setInterval] = React.useState<number | null>(null);
      void useAsyncInterval(() => {
        effect();
      }, interval);
      return null;
    }
    render(<TestComp />);

    jest.advanceTimersByTime(TINY_INTERVAL);

    expect(effect).not.toBeCalled();

    act(() => setInterval(TINY_INTERVAL));

    jest.advanceTimersByTime(TINY_INTERVAL);

    expect(effect).toBeCalledTimes(1);
  });
});
