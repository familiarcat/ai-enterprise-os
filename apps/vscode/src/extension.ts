import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Sovereign Factory VSCode Extension is now active!');

    let disposable = vscode.commands.registerCommand('sovereign-factory.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from Sovereign Factory!');
    });
    context.subscriptions.push(disposable);
}