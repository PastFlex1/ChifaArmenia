Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set objShell = WScript.CreateObject("WScript.Shell")
objShell.CurrentDirectory = currentDir

' Verificar si el servidor de impresion de tickets ya esta ejecutandose para evitar duplicados
On Error Resume Next
Set WMIService = GetObject("winmgmts:\\.\root\cimv2")
Set colItems = WMIService.ExecQuery("Select CommandLine from Win32_Process Where Name = 'node.exe'")

isPrintRunning = False

For Each objItem in colItems
    If Not IsNull(objItem.CommandLine) Then
        If InStr(objItem.CommandLine, "print-server.js") > 0 Then
            isPrintRunning = True
        End If
    End If
Next
On Error Goto 0

' Arrancar UNICAMENTE el Servidor de Impresion de Tickets si no estaba iniciado
If Not isPrintRunning Then
    objShell.Run "cmd /c ""runner_print.bat""", 0, False
End If
