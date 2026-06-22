import sys  
data = sys.stdin.read()  
open('server.mjs','w',encoding='utf-8').write(data)  
print('OK') 
