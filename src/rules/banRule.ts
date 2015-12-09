/**
 * @license
 * Copyright 2013 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from "typescript";
import * as Lint from "../lint";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        name: "ban",
        description: "Bans the use of specific functions.",
        options: {
            type: Lint.RuleOptionType.LIST,
            description: "Contains ['object', 'function'] pairs so that object.function() is banned.",
            listType: {
                type: Lint.RuleOptionType.ARRAY,
                arrayMembers: [
                    { description: "Object to ban", type: Lint.RuleOptionType.STRING },
                    { description: "Method name to ban", type: Lint.RuleOptionType.STRING },
                ],
            },
        },
        optionExamples: [`[true, ['console', 'log'], ['someObject', 'someFunction']]`],
        type: Lint.RuleType.READABILITY,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING_PART = "function invocation disallowed: ";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const options = this.getOptions();
        const banFunctionWalker = new BanFunctionWalker(sourceFile, options);
        const functionsToBan = options.ruleArguments;
        functionsToBan.forEach((f) => banFunctionWalker.addBannedFunction(f));
        return this.applyWithWalker(banFunctionWalker);
    }
}

export class BanFunctionWalker extends Lint.RuleWalker {
    private bannedFunctions: string[][] = [];

    public addBannedFunction(bannedFunction: string[]) {
        this.bannedFunctions.push(bannedFunction);
    }

    public visitCallExpression(node: ts.CallExpression) {
        const expression = node.expression;

        if (expression.kind === ts.SyntaxKind.PropertyAccessExpression
                && expression.getChildCount() >= 3) {

            const firstToken = expression.getFirstToken();
            const secondToken = expression.getChildAt(1);
            const thirdToken = expression.getChildAt(2);

            const firstText = firstToken.getText();
            const thirdText = thirdToken.getFullText();

            if (secondToken.kind === ts.SyntaxKind.DotToken) {
                for (const bannedFunction of this.bannedFunctions) {
                    if (firstText === bannedFunction[0] && thirdText === bannedFunction[1]) {
                        const failure = this.createFailure(
                            expression.getStart(),
                            expression.getWidth(),
                            `${Rule.FAILURE_STRING_PART}${firstText}.${thirdText}`
                        );
                        this.addFailure(failure);
                    }
                }
            }
        }

        super.visitCallExpression(node);
    }
}
