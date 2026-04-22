CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('admin', 'operador', 'supervisor')) NOT NULL DEFAULT 'operador',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES public.warehouses(id) NOT NULL,
  box_number INTEGER NOT NULL CHECK (box_number BETWEEN 1 AND 20),
  status TEXT CHECK (status IN ('empty', 'partial', 'full', 'spent')) NOT NULL DEFAULT 'empty',
  current_onu_count INTEGER NOT NULL DEFAULT 0 CHECK (current_onu_count BETWEEN 0 AND 20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.onus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial TEXT NOT NULL UNIQUE,
  model TEXT,
  mac TEXT,
  consecutive TEXT, 
  status TEXT NOT NULL DEFAULT 'warehouse_1',
  box_id UUID REFERENCES public.boxes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT CHECK (type IN ('ingreso', 'transferencia', 'consumo', 'ajuste')) NOT NULL,
  from_warehouse UUID REFERENCES public.warehouses(id),
  to_warehouse UUID REFERENCES public.warehouses(id),
  box_id UUID REFERENCES public.boxes(id),
  quantity INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.warehouses (name) VALUES 
('Almacén 1'), 
('Almacén 2')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view warehouses" ON public.warehouses FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view boxes" ON public.boxes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert boxes" ON public.boxes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update boxes" ON public.boxes FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view onus" ON public.onus FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert onus" ON public.onus FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update onus" ON public.onus FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view movements" ON public.movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert movements" ON public.movements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'operador');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
