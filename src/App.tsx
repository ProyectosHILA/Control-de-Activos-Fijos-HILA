import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TabType, Activo, KPIStats, ImportSummary, UserSession, DocumentoSubido } from './types';
import { SAMPLE_ACTIVOS } from './data/sampleData';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { InteractiveChartsView } from './components/InteractiveChartsView';
import { ActivosView } from './components/ActivosView';
import { ImportacionView } from './components/ImportacionView';
import { InventarioView } from './components/InventarioView';
import { EscanerView } from './components/EscanerView';
import { DepreciacionView } from './components/DepreciacionView';
import { BajasView } from './components/BajasView';
import { ReportesView } from './components/ReportesView';
import { GestorDocumentalView } from './components/GestorDocumentalView';
import { ActivoModal } from './components/ActivoModal';
import {
  subscribeToActivos,
  saveActivoToFirebase,
  deleteActivoFromFirebase,
  bulkUploadActivosToFirebase,
  clearAllActivosInFirebase
} from './lib/firebase';

const SESSION_KEY = 'hila_auth_session_v1';
const LOCAL_CACHE_KEY = 'hila_activos_data_v1';
const LOCAL_DOCS_KEY = 'hila_documentos_v1';

// Initial base document representing the foundational inventory
const DEFAULT_BASE_DOC: DocumentoSubido = {
  id: 'doc_base',
  nombreArchivo: 'Inventario Base HILA.xlsx',
  nombrePersonalizado: 'Inventario Base Hospital Infantil',
  fechaCarga: '02/01/2025, 08:00 AM',
  totalActivos: SAMPLE_ACTIVOS.length,
  activoVisible: true,
  tamano: '185 KB',
  valorTotal: SAMPLE_ACTIVOS.reduce((acc, a) => acc + (a.valor_historico || 0), 0),
  depreciacionTotal: SAMPLE_ACTIVOS.reduce((acc, a) => acc + (a.depreciacion_acumulada || 0), 0),
};

export default function App() {
  // Authentication State
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isAuthenticated && parsed.username === 'user_control') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Document Batches State
  const [documentos, setDocumentos] = useState<DocumentoSubido[]>(() => {
    try {
      const cachedDocs = localStorage.getItem(LOCAL_DOCS_KEY);
      if (cachedDocs) {
        const parsed = JSON.parse(cachedDocs);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_BASE_DOC];
  });

  // Activos State
  const [activos, setActivos] = useState<Activo[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return SAMPLE_ACTIVOS.map((a) => ({ ...a, documentId: a.documentId || 'doc_base' }));
  });

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);

  // Selected asset modal state
  const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewModal, setIsNewModal] = useState<boolean>(false);

  const initialFirestoreSynced = useRef<boolean>(false);

  // Sync to local server backend API on disk
  const syncToServerDisk = (docs: DocumentoSubido[], acts: Activo[]) => {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentos: docs, activos: acts }),
    }).catch((e) => console.warn('Server sync error:', e));
  };

  // On mount: Load persistent data from server disk
  useEffect(() => {
    fetch('/api/data')
      .then((res) => {
        if (!res.ok) throw new Error('Server returned non-200');
        return res.json();
      })
      .then((serverData) => {
        if (serverData && Array.isArray(serverData.activos) && serverData.activos.length > 0) {
          setActivos(serverData.activos);
          try {
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(serverData.activos));
          } catch {}

          if (Array.isArray(serverData.documentos) && serverData.documentos.length > 0) {
            setDocumentos(serverData.documentos);
            try {
              localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(serverData.documentos));
            } catch {}
          }
        } else {
          // Initialize server disk with initial data
          syncToServerDisk(documentos, activos);
        }
      })
      .catch((err) => {
        console.warn('Initial server fetch:', err);
      });
  }, []);

  // Connect to Firebase Firestore Real-Time Listener
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeToActivos(
      (remoteActivos) => {
        if (!isMounted) return;
        setIsFirebaseConnected(true);

        if (remoteActivos.length > 0) {
          initialFirestoreSynced.current = true;
          // Keep documentId if present
          const normalized = remoteActivos.map((a) => ({
            ...a,
            documentId: a.documentId || 'doc_base',
          }));
          setActivos(normalized);
          try {
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(normalized));
          } catch {}
        } else if (!initialFirestoreSynced.current) {
          // If Firestore is completely empty on initial setup, seed it with sample activos
          initialFirestoreSynced.current = true;
          bulkUploadActivosToFirebase(SAMPLE_ACTIVOS).catch((e) =>
            console.warn('Initial seeding error:', e)
          );
        }
      },
      (err) => {
        console.warn('Firebase connection issue, running in resilient mode:', err);
        setIsFirebaseConnected(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Update local storage backup
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(activos));
    } catch {}
  }, [activos]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(documentos));
    } catch {}
  }, [documentos]);

  // Compute Active Document IDs
  const activeDocIds = useMemo(() => {
    const set = new Set<string>();
    documentos.forEach((d) => {
      if (d.activoVisible) {
        set.add(d.id);
      }
    });
    return set;
  }, [documentos]);

  // Filter Visible Activos based on Active Documents in Gestor Documental
  const visibleActivos = useMemo(() => {
    return activos.filter((a) => {
      const docId = a.documentId || 'doc_base';
      return activeDocIds.has(docId);
    });
  }, [activos, activeDocIds]);

  // Login handler
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    } catch {}
  };

  // Logout handler
  const handleLogout = () => {
    setSession(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  // Compute live KPI statistics from VISIBLE activos
  const stats: KPIStats = useMemo(() => {
    const total = visibleActivos.length;
    let vigentes = 0;
    let depreciados = 0;
    let valorTotal = 0;
    let depreAcum = 0;
    let saldoDepre = 0;
    let tipo1 = 0;
    let tipo2 = 0;

    visibleActivos.forEach((a) => {
      if (a.estado === 'Activo') vigentes++;
      if (a.estado === 'Depreciado') depreciados++;
      valorTotal += a.valor_historico || 0;
      depreAcum += a.depreciacion_acumulada || 0;
      saldoDepre += a.saldo_por_depreciar || 0;

      if (a.estado === 'Depreciado') {
        tipo1++;
      } else if (a.saldo_por_depreciar <= 0 && a.estado === 'Activo') {
        tipo2++;
      }
    });

    const pct = valorTotal > 0 ? Math.round((depreAcum / valorTotal) * 100) : 0;

    return {
      total_activos: total,
      activos_vigentes: vigentes,
      activos_depreciados: depreciados,
      valor_total: valorTotal,
      depreciacion_acum: depreAcum,
      saldo_por_depreciar: saldoDepre,
      pct_depre: pct,
      activos_faltantes: 0,
      activos_encontrados: 0,
      tipo1_bajas: tipo1,
      tipo2_bajas: tipo2,
    };
  }, [visibleActivos]);

  // Toggle document visibility
  const handleToggleDocumento = (docId: string) => {
    setDocumentos((prev) => {
      const next = prev.map((d) =>
        d.id === docId ? { ...d, activoVisible: !d.activoVisible } : d
      );
      try {
        localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(next));
      } catch {}
      syncToServerDisk(next, activos);
      return next;
    });
  };

  // Rename document
  const handleRenameDocumento = (docId: string, nuevoNombre: string) => {
    setDocumentos((prev) => {
      const next = prev.map((d) =>
        d.id === docId ? { ...d, nombrePersonalizado: nuevoNombre } : d
      );
      try {
        localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(next));
      } catch {}
      syncToServerDisk(next, activos);
      return next;
    });
  };

  // Delete document and all associated assets
  const handleDeleteDocumento = async (docId: string) => {
    const nextDocs = documentos.filter((d) => d.id !== docId);
    const nextActivos = activos.filter((a) => (a.documentId || 'doc_base') !== docId);

    setDocumentos(nextDocs);
    setActivos(nextActivos);

    try {
      localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(nextDocs));
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(nextActivos));
    } catch {}

    // Sync to server disk
    syncToServerDisk(nextDocs, nextActivos);
    fetch(`/api/documentos/${docId}`, { method: 'DELETE' }).catch(() => {});

    // Delete associated assets from Firebase Firestore
    const toDelete = activos.filter((a) => (a.documentId || 'doc_base') === docId);
    for (const a of toDelete) {
      deleteActivoFromFirebase(a.id).catch(() => {});
    }
  };

  // Handle import completion and sync with Server + Firebase
  const handleImportComplete = async (
    newActivos: Activo[],
    summary: ImportSummary,
    mode: 'add_batch' | 'replace' | 'merge',
    docMeta?: {
      nombreArchivo: string;
      nombrePersonalizado: string;
      tamano?: string;
    }
  ) => {
    setIsSyncingFirebase(true);

    try {
      const docId = `doc_${Date.now()}`;
      const nowStr = new Date().toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      });

      if (mode === 'add_batch') {
        // Tag newly imported assets with this document ID
        const taggedActivos: Activo[] = newActivos.map((a) => ({
          ...a,
          documentId: docId,
        }));

        const newDoc: DocumentoSubido = {
          id: docId,
          nombreArchivo: docMeta?.nombreArchivo || 'Carga_Manual.xlsx',
          nombrePersonalizado: docMeta?.nombrePersonalizado || 'Lote Importado',
          fechaCarga: nowStr,
          totalActivos: taggedActivos.length,
          activoVisible: true,
          tamano: docMeta?.tamano || `${Math.round(taggedActivos.length * 0.25)} KB`,
          valorTotal: taggedActivos.reduce((acc, a) => acc + (a.valor_historico || 0), 0),
          depreciacionTotal: taggedActivos.reduce((acc, a) => acc + (a.depreciacion_acumulada || 0), 0),
        };

        const updatedDocs = [newDoc, ...documentos];
        const updatedActivos = [...taggedActivos, ...activos];

        setDocumentos(updatedDocs);
        setActivos(updatedActivos);

        syncToServerDisk(updatedDocs, updatedActivos);
        await bulkUploadActivosToFirebase(taggedActivos);
      } else if (mode === 'replace') {
        const taggedActivos: Activo[] = newActivos.map((a) => ({
          ...a,
          documentId: docId,
        }));

        const newDoc: DocumentoSubido = {
          id: docId,
          nombreArchivo: docMeta?.nombreArchivo || 'Carga_Maestra.xlsx',
          nombrePersonalizado: docMeta?.nombrePersonalizado || 'Inventario Maestro',
          fechaCarga: nowStr,
          totalActivos: taggedActivos.length,
          activoVisible: true,
          tamano: docMeta?.tamano || `${Math.round(taggedActivos.length * 0.25)} KB`,
          valorTotal: taggedActivos.reduce((acc, a) => acc + (a.valor_historico || 0), 0),
          depreciacionTotal: taggedActivos.reduce((acc, a) => acc + (a.depreciacion_acumulada || 0), 0),
        };

        setDocumentos([newDoc]);
        setActivos(taggedActivos);

        syncToServerDisk([newDoc], taggedActivos);
        await clearAllActivosInFirebase();
        await bulkUploadActivosToFirebase(taggedActivos);
      } else {
        // Merge
        const mergedActivos = [...newActivos];
        setActivos(mergedActivos);
        syncToServerDisk(documentos, mergedActivos);
        await bulkUploadActivosToFirebase(newActivos);
      }
    } catch (err) {
      console.error('Failed to sync import with Firebase / Server:', err);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // Asset creation / editing
  const handleSelectActivo = (activo: Activo) => {
    setSelectedActivo(activo);
    setIsNewModal(false);
    setIsModalOpen(true);
  };

  const handleOpenNewActivo = () => {
    setSelectedActivo(null);
    setIsNewModal(true);
    setIsModalOpen(true);
  };

  const handleSaveActivo = async (saved: Activo) => {
    // If saving a new asset without documentId, assign to first active doc or doc_base
    const finalSaved: Activo = {
      ...saved,
      documentId: saved.documentId || Array.from(activeDocIds)[0] || 'doc_base',
    };

    setActivos((prev) => {
      const idx = prev.findIndex((a) => a.id === finalSaved.id || a.codigo === finalSaved.codigo);
      let next: Activo[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = finalSaved;
      } else {
        next = [finalSaved, ...prev];
      }
      syncToServerDisk(documentos, next);
      return next;
    });

    try {
      await saveActivoToFirebase(finalSaved);
    } catch (e) {
      console.error('Failed to save asset to Firebase:', e);
    }
  };

  // Single asset delete
  const handleDeleteActivo = async (id: string | number) => {
    setActivos((prev) => {
      const next = prev.filter((a) => a.id !== id && a.codigo !== id);
      syncToServerDisk(documentos, next);
      return next;
    });

    try {
      await deleteActivoFromFirebase(id);
    } catch (e) {
      console.error('Failed to delete asset from Firebase:', e);
    }
  };

  // Bulk assets delete
  const handleBulkDeleteActivos = async (ids: (string | number)[]) => {
    const idSet = new Set(ids.map(String));
    setActivos((prev) => {
      const next = prev.filter((a) => !idSet.has(String(a.id)) && !idSet.has(String(a.codigo)));
      syncToServerDisk(documentos, next);
      return next;
    });

    for (const id of ids) {
      try {
        await deleteActivoFromFirebase(id);
      } catch (e) {
        console.error('Failed to delete asset in batch:', e);
      }
    }
  };

  // If not authenticated, render Login Screen
  if (!session || !session.isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-800 antialiased font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        totalActivos={visibleActivos.length}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Topbar */}
        <Topbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onGoToImport={() => setCurrentTab('importacion')}
          onGoToCharts={() => setCurrentTab('graficos')}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (q && currentTab !== 'activos') {
              setCurrentTab('activos');
            }
          }}
          totalActivos={visibleActivos.length}
          userSession={session}
          onLogout={handleLogout}
          isFirebaseConnected={isFirebaseConnected}
        />

        {/* View container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              activos={visibleActivos}
              stats={stats}
              onNavigate={setCurrentTab}
              onSelectActivo={handleSelectActivo}
            />
          )}

          {currentTab === 'graficos' && (
            <InteractiveChartsView activos={visibleActivos} />
          )}

          {currentTab === 'activos' && (
            <ActivosView
              activos={visibleActivos}
              onSelectActivo={handleSelectActivo}
              onOpenNewActivo={handleOpenNewActivo}
              onNavigate={setCurrentTab}
              onDeleteActivo={handleDeleteActivo}
              onBulkDeleteActivos={handleBulkDeleteActivos}
              canDelete={session?.canDelete ?? true}
              initialQuery={searchQuery}
            />
          )}

          {currentTab === 'documentos' && (
            <GestorDocumentalView
              documentos={documentos}
              activos={activos}
              onToggleDocumento={handleToggleDocumento}
              onDeleteDocumento={handleDeleteDocumento}
              onRenameDocumento={handleRenameDocumento}
              onNavigate={setCurrentTab}
              onSelectActivo={handleSelectActivo}
            />
          )}

          {currentTab === 'importacion' && (
            <ImportacionView
              currentActivos={activos}
              onImportComplete={handleImportComplete}
              onNavigate={setCurrentTab}
              isSyncingFirebase={isSyncingFirebase}
            />
          )}

          {currentTab === 'inventario' && (
            <InventarioView
              activos={visibleActivos}
              onNavigate={setCurrentTab}
              onSelectActivo={handleSelectActivo}
            />
          )}

          {currentTab === 'escaner' && (
            <EscanerView
              activos={visibleActivos}
              onSelectActivo={handleSelectActivo}
            />
          )}

          {currentTab === 'depreciacion' && (
            <DepreciacionView
              activos={visibleActivos}
              onSelectActivo={handleSelectActivo}
            />
          )}

          {currentTab === 'bajas' && (
            <BajasView
              activos={visibleActivos}
              onSelectActivo={handleSelectActivo}
            />
          )}

          {currentTab === 'reportes' && (
            <ReportesView
              activos={visibleActivos}
              documentos={documentos}
            />
          )}
        </main>
      </div>

      {/* Asset Detail & Edit Modal */}
      <ActivoModal
        activo={selectedActivo}
        isOpen={isModalOpen}
        isNew={isNewModal}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveActivo}
        onDelete={handleDeleteActivo}
      />
    </div>
  );
}
