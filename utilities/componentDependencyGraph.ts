import { parseTag } from "../htmlisp/parsers/htmlisp/parseTag.ts";
import type { Element } from "../htmlisp/types.ts";
import type { BuildWorkerEvent } from "../types.ts";

type ComponentSourceDefinition = {
  htmlInput: string;
  sourcePath: string;
  utilitiesPath?: string;
};

type ComponentDependencyNode = {
  dependencyTasks: BuildWorkerEvent[];
  directDependencies: string[];
  sourcePath: string;
  transitiveDependencies: string[];
  utilitiesPath?: string;
};

type ComponentDependencyGraph = Record<string, ComponentDependencyNode>;

function createComponentDependencyGraph(
  componentDefinitions: Record<string, ComponentSourceDefinition>,
): ComponentDependencyGraph {
  const componentNames = new Set(Object.keys(componentDefinitions));
  const directDependencies = Object.fromEntries(
    Object.entries(componentDefinitions).map(([componentName, definition]) => [
      componentName,
      collectDirectComponentDependencies(definition.htmlInput, componentNames),
    ]),
  ) as Record<string, string[]>;

  return Object.fromEntries(
    Object.entries(componentDefinitions).map(([componentName, definition]) => {
      const transitiveDependencies = collectTransitiveDependencies(
        componentName,
        directDependencies,
      );

      return [
        componentName,
        {
          dependencyTasks: buildDependencyTasks(
            [componentName].concat(transitiveDependencies),
            componentDefinitions,
          ),
          directDependencies: directDependencies[componentName] || [],
          sourcePath: definition.sourcePath,
          transitiveDependencies,
          utilitiesPath: definition.utilitiesPath,
        },
      ];
    }),
  );
}

function buildDependencyTasks(
  componentNames: string[],
  componentDefinitions: Record<string, ComponentSourceDefinition>,
) {
  const tasks: BuildWorkerEvent[] = [];
  const seen = new Set<string>();

  for (const componentName of componentNames) {
    const definition = componentDefinitions[componentName];

    if (!definition) {
      continue;
    }

    const sourceTask = {
      type: "readTextFile" as const,
      payload: {
        path: definition.sourcePath,
        type: "components",
      },
    };
    const sourceKey = JSON.stringify(sourceTask);

    if (!seen.has(sourceKey)) {
      tasks.push(sourceTask);
      seen.add(sourceKey);
    }

    if (definition.utilitiesPath) {
      const utilitiesTask = {
        type: "loadModule" as const,
        payload: {
          path: definition.utilitiesPath,
          type: "globalUtilities",
        },
      };
      const utilitiesKey = JSON.stringify(utilitiesTask);

      if (!seen.has(utilitiesKey)) {
        tasks.push(utilitiesTask);
        seen.add(utilitiesKey);
      }
    }
  }

  return tasks;
}

function collectDirectComponentDependencies(
  htmlInput: string,
  componentNames: Set<string>,
) {
  const dependencies = new Set<string>();

  walkAst(parseTag(htmlInput), (element) => {
    if (isComponentReference(element.type, componentNames)) {
      dependencies.add(element.type);
    }
  });

  return [...dependencies].sort();
}

function collectTransitiveDependencies(
  componentName: string,
  directDependencies: Record<string, string[]>,
) {
  const collected = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visiting.has(name)) {
      return;
    }

    visiting.add(name);

    for (const dependencyName of directDependencies[name] || []) {
      if (dependencyName !== componentName) {
        collected.add(dependencyName);
      }

      visit(dependencyName);
    }

    visiting.delete(name);
  }

  visit(componentName);

  return [...collected].sort();
}

function isComponentReference(type: string, componentNames: Set<string>) {
  const firstLetter = type[0];

  return !["!", "?"].includes(firstLetter) &&
    componentNames.has(type) &&
    firstLetter?.toUpperCase() === firstLetter &&
    !type.split("").every((character) => character.toUpperCase() === character);
}

function walkAst(
  ast: (string | Element)[],
  visit: (element: Element) => void,
) {
  for (const node of ast) {
    if (typeof node === "string") {
      continue;
    }

    visit(node);
    walkAst(node.children, visit);
  }
}

export { createComponentDependencyGraph };
export type {
  ComponentDependencyGraph,
  ComponentDependencyNode,
  ComponentSourceDefinition,
};
