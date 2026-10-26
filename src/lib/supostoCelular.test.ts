import { expect, test } from "vitest";
import { supostoCelular } from "@/components/Assistencial2518Prestadores";
test("ex1", () => expect(supostoCelular("(17) 3201-2300 / 9 9624 2649 / (17) 3201-2300 / 9 9 624-2649")).toBe("(17) 99624-2649"));
test("ex2", () => expect(supostoCelular("(17) 98831-4607 / 99733-6108(17) 98831-4607 / 99733-6108")).toBe("(17) 98831-4607"));
