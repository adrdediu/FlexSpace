import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Input,
  Button,
  Text,
  makeStyles,
  tokens,
  Spinner,
  Title1,
  Body1,
  Divider,
} from '@fluentui/react-components';
import {
  PersonRegular,
  LockClosedRegular,
  ArrowRight24Filled,
} from '@fluentui/react-icons';
import {useAuth} from '../contexts/AuthContext';
import {BuildingDesktopFilled} from '@fluentui/react-icons';
const useStyles = makeStyles({
  container: {
    display:'flex',
    justifyContent:'center',
    alignItems:'center',
    height:'100%',
    width:'100%',
    flex:1,
    zIndex:1,
  },
  globeOverlay:{
    position:'absolute',
    inset:0,
    opacity:0.75,
    pointerEvents:'none',
  },
  loginContainer:{
    display:'flex',
    width:'900px',
    maxWidth:'90%',
    borderRadius:'16px',
    overflow:'hidden',
    boxShadow:'tokens.shadow64',
    zIndex:2,
    pointerEvents:'all',
  },
  leftPanel: {
    flex:'1 1 50%',
    padding:'40px',
    backgroundColor:tokens.colorNeutralBackground1,
    display:'flex',
    flexDirection:'column',
    justifyContent:'center',
  },
  rightPanel: {
    flex:'1 1 50%',
    padding:'40px',
    background:'linear-gradient(145deg,var(--colorCompoundBrandBackground) 0%, var(--colorPaletteGreenForeground1) 100%)',
    display:'flex',
    flexDirection:'column',
    justifyContent:'center',
    color:'white',
    position:'relative',
    overflow:'hidden',
    '@media (max-width:768px)': {
      display:'none',
    },
  },
  patternOverlay:{
    position:'absolute',
    top:0,
    left:0,
    right:0,
    bottom:0,
    opacity:0.1,
    backgroundImage:''
  },
  welcomeText:{
    position:'relative',
    zIndex:1,
  },
  header:{
    marginBottom:'32px',
  },
  title:{
    fontSize:'28px',
    fontWeight:'bold',
    color:tokens.colorBrandForeground1,
    marginBottom:'8px',
    display:'block',
  },
  subtitle:{
    color:tokens.colorNeutralForeground2,
    marginBottom:'24px',
    display:'block',
  },
  form:{
    display:'flex',
    flexDirection:'column',
    gap:'20px',
  },
  inputGroup:{
    display:'flex',
    flexDirection:'column',
    gap:'8px',
  },
  input: {
    borderRadius:'8px',
    height:'44px',
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    marginTop:'16px',
  },
  loginButton: {
    backgroundColor:tokens.colorBrandForeground1,
    color:'white',
    height:'44px',
    borderRadius:'8px',
    marginTop:'8px',
    ':hover':{
      backgroundColor:tokens.colorBrandForeground2,
    },
  },
  dividerContainer: {
    display:'flex',
    alignItems:'center',
    margin:'20px 0',
  },
  divider: {
    flex:1,
  },
  dividerText:{
    margin:'0 10px',
    color: tokens.colorNeutralForeground3,
  },
  socialButtons:{
    display:'flex',
    gap:'12px',
    justifyContent:'center',
  },
  socialButton:{
    borderRadius:'8px',
    height:'44px',
    width:'44px',
    display:'flex',
    justifyContent:'center',
    alignItems:'center',
  },
  featureList: {
    marginTop:'40px',
    listStyle: 'none',
    padding: 0,
    position: 'relative',
    zIndex:1,
  },
  featureItem: {
    display:'flex',
    alignItems:'center',
    marginBottom:'16px',
    gap:'12px',
  },
  featureIcon: {
    width:'24px',
    height:'24px',
    borderRadius:'50%',
    backgroundColor:'rgba(255,255,255,0.2)',
    display:'flex',
    justifyContent:'center',
    alignItems:'center',
  },
  
  
  logo:{
    width:'70px',
    height:'70px',
    marginBottom:'24px',
    borderRadius:'12px',
    background:'linear-gradient(145deg,var(--colorCompoundBrandBackground) 0%, var(--colorPaletteGreenForeground1) 100%)',
    display:'flex',
    justifyContent:'center',
    alignItems:'center',
    color:'white',
    fontSize:'24px',
    fontWeight:'bold',
    border:'5px solid white'
  },
  logoText:{
    marginLeft:'4px',
  },
  brandTitle :{
    fontSize:'24px',
    fontWeight:'bold',
    color:'white',
    marginBottom:'16px',
    display:'block',
  },
  brandDescription:{
    color:'rgba(255,255,255,0.9',
    marginBottom:'24px',
    display:'block',
  }
});
interface LoginProps {
  onMount?: () => void;
}

const Login: React.FC<LoginProps> =({onMount}) => {
  const styles = useStyles();
  const {login, error: authError} = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string |null>(null);
  
  
  useEffect(() => {
    if(onMount) {
      onMount();
    }
  }, [onMount]);
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if(!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const success = await login(username, password);
      if(success) {
        navigate('/');
      } else {
        setError('Login Failed. Please check your credentials');
      }
    } catch (err) {
      setError('An error has occured during login. Please try again');
      console.error('Login error:',err);
    } finally {
      setLoading(false);
    }
  };
  
  
  return (
    <div className={styles.container}>
      <div className={styles.loginContainer}>
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <Title1 as="h1" className={styles.title} > Welcome Back </Title1>
            <Body1 as="p" className={styles.subtitle} > Sign in to continue to the FlexSpace</Body1>
          </div>
          
          
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <Text weight="semibold"> Username</Text>
              <Input
                className={styles.input}
                contentBefore={<PersonRegular />}
                placeholder="Enter your name"
                value={username}
                onChange={(e,data) => setUsername(data.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
              <Text weight="semibold">Password</Text>
              <Input
               className={styles.input}
               contentBefore={<LockClosedRegular/>}
               placeholder="Enter your password"
               type="password"
               value={password}
               onChange={(e,data) => setPassword(data.value)}
               disabled={loading}
               required
              />
            </div>
            
            <Button
             className={styles.loginButton}
             appearance="primary"
             type="submit"
             disabled={loading}
             iconPosition="after"
             icon={loading ? <Spinner size="tiny" appearance="inverted" /> : <ArrowRight24Filled />}
             >
               {loading ? 'Signing in...': 'Sign in'}
            </Button>
            
            {(error || authError) && (
              <Text className={styles.error}>
                {error|| authError}
              </Text>
            )}
          </form>
          
          <div className={styles.dividerContainer}>
            <Divider className={styles.divider} />
            <Text className={styles.dividerText}>or</Text>
            <Divider className={styles.divider} />
          </div>
          
          <Text align="center" size={200} style={{color: tokens.colorNeutralForeground3}}>
            Contact your administrator if you need access
          </Text>
        </div>
        
        <div className={styles.rightPanel}>
          <div className={styles.patternOverlay}></div>
          
          <div className={styles.welcomeText}>
            <div className={styles.logo}>
              <BuildingDesktopFilled />
              <span className={styles.logoText}>
                FS 
              </span>
            </div>
            
            <Text as="h2" className={styles.brandTitle}>
              FlexSpace
            </Text>
            
            <Text as="p" className={styles.brandDescription}>
              Efficiently manage and book desk spaces in your organization
            </Text>
          </div>
          
          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>✓</div>
              <Body1>Real-time availability updates</Body1>
            </li>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>✓</div>
              <Body1>Interactive office map</Body1>
            </li>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>✓</div>
              <Body1>Booking history and management</Body1>
            </li>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>✓</div>
              <Body1>Seamless team coordination</Body1>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;