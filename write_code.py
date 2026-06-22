import sys  
data = sys.stdin.buffer.read()  
open('server.mjs','wb').write(data)  
print('ok')  
