Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set objShell = WScript.CreateObject("WScript.Shell")
objShell.CurrentDirectory = currentDir

' Verificar si ya existe un proceso de node.exe ejecutando print-server-sucursal2.js
On Error Resume Next
Set WMIService = GetObject("winmgmts:\\.\root\cimv2")
Set colItems = WMIService.ExecQuery("Select CommandLine from Win32_Process Where Name = 'node.exe'")

isPrintRunning = False

For Each objItem in colItems
    If Not IsNull(objItem.CommandLine) Then
        If InStr(objItem.CommandLine, "print-server-sucursal2.js") > 0 Then
            isPrintRunning = True
        End If
    End If
Next
On Error Goto 0

' Solo arrancar si NO estaba iniciado previamente (evita duplicar impresiones)
If Not isPrintRunning Then
    If fso.FileExists(currentDir & "\node.exe") Then
        objShell.Run """" & currentDir & "\node.exe"" print-server-sucursal2.js", 0, False
    Else
        objShell.Run "cmd /c node print-server-sucursal2.js", 0, False
    End If
End If
