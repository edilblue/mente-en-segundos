import numpy as np, wave, sys
SR=48000; D=15.0; t=np.arange(int(SR*D))/SR; rng=np.random.default_rng(7)
def env(a,d): # fade in/out
    e=np.ones_like(t); e*=np.clip(t/a,0,1); e*=np.clip((D-t)/d,0,1); return e
out=np.zeros((2,len(t)))
# pad: D minor -> Bb -> D minor drones, detuned saws softened
def note(f): return 440*2**((f-69)/12)
chords=[(0,[38,50,53,57]),(5.3,[34,46,53,58]),(9.3,[38,50,53,57,62]),(11.7,[31,43,50,58])]
for i,(st,ns) in enumerate(chords):
    en=chords[i+1][0] if i+1<len(chords) else D
    w=np.clip((t-st+0.8)/1.6,0,1)*np.clip((en+0.8-t)/1.6,0,1)
    for n in ns:
        f=note(n)
        for ch,det in ((0,-0.15),(1,0.15)):
            ph=2*np.pi*(f+det)*t
            s=np.sin(ph)+0.3*np.sin(2*ph+0.3)+0.12*np.sin(3*ph)
            out[ch]+=w*s*(0.5 if n<45 else 0.22)*(0.85+0.15*np.sin(2*np.pi*0.2*t+n))
# airy noise bed (lowpassed)
nz=rng.standard_normal((2,len(t)))
k=np.ones(400)/400
for ch in range(2): out[ch]+=0.15*np.convolve(nz[ch],k,'same')*(0.6+0.4*np.sin(2*np.pi*0.13*t))
# chimes at sparkles
def chime(at,base=86,g=0.35):
    for j,n in enumerate([base,base+7,base+12,base+16]):
        st=at+j*0.06; m=t>=st; tt=t[m]-st
        s=np.sin(2*np.pi*note(n)*tt)*np.exp(-tt*3.2)*g
        out[j%2][m]+=s; out[(j+1)%2][m]+=s*0.5
for a in (0.15,2.0,9.3,14.2): chime(a)
for a in (11.75,): chime(a,81,0.3)
# whooshes at cuts
def whoosh(at,dur=0.5,g=0.5):
    m=(t>=at-dur)&(t<at+0.15); tt=t[m]-(at-dur)
    e=np.sin(np.pi*np.clip(tt/(dur+0.15),0,1))**2
    n=rng.standard_normal(m.sum()); n=np.convolve(n,np.ones(30)/30,'same')
    for ch in range(2): out[ch][m]+=g*e*n
for a in (2.0,5.3,7.45,8.2,8.95,9.3,11.7): whoosh(a)
# low hit at start and close
for a in (0.1,11.7):
    m=t>=a; tt=t[m]-a; out[:,m]+=0.9*np.sin(2*np.pi*48*tt*np.exp(-tt*0.6))*np.exp(-tt*2.5)
out*=env(0.4,1.2)
out/=np.max(np.abs(out))*1.12
pcm=(out.T*32767).astype('<i2')
with wave.open(sys.argv[1],'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
