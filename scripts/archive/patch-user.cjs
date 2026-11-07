const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'UserManagement.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const componentCode = `
const UserTableRow = React.memo(({
  u,
  currentUser,
  getRoleBadge,
  handleOpenResetPassModal,
  handleOpenEditModal,
  handleOpenDeleteModal
}: {
  u: any;
  currentUser: any;
  getRoleBadge: (u: any) => React.ReactNode;
  handleOpenResetPassModal: (u: any) => void;
  handleOpenEditModal: (u: any) => void;
  handleOpenDeleteModal: (u: any) => void;
}) => {
  const isCurrent = currentUser?.uid === u.uid;
  const isProtectedAdmin = u.uid === 'usr-admin';

  return (
    <tr className="hover:bg-white/5/70 dark:hover:bg-slate-800/30 transition-colors">
      {/* Name & Avatar */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs flex-shrink-0">
            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {u.name}
              </span>
              {isCurrent && (
                <span className="px-1.5 py-0.2 text-[9px] font-black bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded border border-blue-400/30">
                  Anda
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              {u.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {u.phone}
                </span>
              )}
              {u.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {u.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Credentials */}
      <td className="px-5 py-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white/5 backdrop-blur-xl px-2 py-0.5 rounded text-[11px]">
              @{u.username || 'user'}
            </span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              title="Kata sandi akun tersimpan terenkripsi dengan aman menggunakan algoritma bcrypt hashing"
            >
              <Lock className="w-2.5 h-2.5" />
              bcrypt
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {u.lastLoginAt ? \`Login: \${new Date(u.lastLoginAt).toLocaleDateString('id-ID')}\` : 'Belum pernah login'}
          </p>
        </div>
      </td>

      {/* Role */}
      <td className="px-5 py-3.5">
        {getRoleBadge(u)}
      </td>

      {/* Class / NIP */}
      <td className="px-5 py-3.5 text-slate-300">
        {u.subRole === 'Wali Kelas' && u.assignedClass ? (
          <span className="font-bold text-rose-600 dark:text-rose-400">
            Kelas {u.assignedClass}
          </span>
        ) : u.nip ? (
          <span className="font-mono text-slate-500">NIP: {u.nip}</span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span
          className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold \${
            u.status === 'aktif'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }\`}
        >
          <span
            className={\`w-1.5 h-1.5 rounded-full \${
              u.status === 'aktif' ? 'bg-emerald-500' : 'bg-rose-500'
            }\`}
          />
          {u.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenResetPassModal(u)}
            className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
            title="Reset Kata Sandi Akun"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenEditModal(u)}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
            title="Ubah Data Pengguna"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {!isProtectedAdmin && !isCurrent && (
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(u)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Hapus Akun dari Database"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
  return prev.u === next.u && prev.currentUser?.uid === next.currentUser?.uid;
});
`;

content = content.replace('export const UserManagement: React.FC = () => {', componentCode + '\nexport const UserManagement: React.FC = () => {');

const startIdx = content.indexOf('filteredUsers.map((u) => {');
const trashButtonIdx = content.indexOf('handleOpenDeleteModal(u)', startIdx);
let endIdx = content.indexOf(')', content.indexOf('</button>', trashButtonIdx));

// endIdx points to the closing ) of the return statement in the map.
// The map has }) right after that. We need to replace up to })
const endOfMap = content.indexOf('})', endIdx) + 2;

const replacement = `filteredUsers.map((u) => (
                  <UserTableRow
                    key={u.uid}
                    u={u}
                    currentUser={currentUser}
                    getRoleBadge={getRoleBadge}
                    handleOpenResetPassModal={handleOpenResetPassModal}
                    handleOpenEditModal={handleOpenEditModal}
                    handleOpenDeleteModal={handleOpenDeleteModal}
                  />
                ))`;

content = content.substring(0, startIdx) + replacement + content.substring(endOfMap);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched UserManagement.tsx');
