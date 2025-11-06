import pandas as pd
import sys

# --- Configuração ---
# Altere o nome do arquivo de entrada se for diferente
arquivo_de_entrada = 'resultado.csv' 

# Nome do arquivo que será gerado
arquivo_de_saida = 'resultado_c.csv'

# Separador para o arquivo de saída (';' é bom para Excel no Brasil)
separador_saida = ';'

# --- Listas de Colunas ---
# Estas são as 8 colunas de "cabeçalho"
colunas_de_id = [
    'Id', 
    'Ip', 
    'Data-Hora', 
    'Nome', 
    'Etapas', 
    'Amostra', 
    'Cod', 
    'Contador'
]

# Estas são as colunas de "emoção" que serão transformadas
colunas_de_emocao = [
    'Neutral', 
    'Happy', 
    'Sad', 
    'Angry', 
    'Disgusted', 
    'Surprised', 
    'Fearful'
]
# --- Fim da Configuração ---


def transformar_dados(input_file, output_file, id_cols, emotion_cols, output_sep):
    """
    Função principal para carregar, transformar e salvar os dados.
    """
    print(f"Iniciando a transformação de '{input_file}'...")

    try:
        # 1. Carregar o arquivo CSV original
        # O arquivo original usava vírgula (,) como separador
        df = pd.read_csv(input_file, sep=',')
        print("Arquivo de entrada carregado com sucesso.")

        # 2. "Derreter" (melt) o DataFrame
        # Transforma as colunas de emoção (largas) em linhas (longas)
        df_melted = df.melt(id_vars=id_cols, 
                              value_vars=emotion_cols, 
                              var_name='Emocao',      # Nova coluna para o nome da emoção
                              value_name='Valores_Str') # Nova coluna para a string "0.1;0.2;..."
        
        print(f"DataFrame 'derretido'. Agora com {len(df_melted)} linhas (uma por emoção).")

        # 3. Limpar a string de valores (remove ';' do final, se houver)
        # Isso evita colunas vazias após a divisão
        df_melted['Valores_Str'] = df_melted['Valores_Str'].str.strip(';')

        # 4. Dividir a string de valores em múltiplas colunas
        # 'expand=True' cria um novo DataFrame com os valores divididos
        df_split = df_melted['Valores_Str'].str.split(';', expand=True)

        # 5. Renomear as novas colunas (que são 0, 1, 2...) para T_1, T_2, T_3...
        df_split.columns = [f'T_{i+1}' for i in df_split.columns]
        
        print(f"Valores das emoções divididos em {len(df_split.columns)} colunas de tempo (T_1, T_2, ...)")

        # 6. Juntar o DataFrame "derretido" (só com IDs e Emoção) com o DataFrame dividido
        # axis=1 significa que estamos juntando colunas (lado a lado)
        df_final = pd.concat([df_melted[id_cols + ['Emocao']], df_split], axis=1)

        # 7. Salvar o resultado
        df_final.to_csv(output_file, index=False, sep=output_sep)
        
        print(f"\n--- Transformação Concluída ---")
        print(f"O novo arquivo foi salvo como: '{output_file}'")
        print("\nVisualização das 5 primeiras linhas do resultado:")
        print(df_final.head())

    except FileNotFoundError:
        print(f"ERRO: O arquivo de entrada '{input_file}' não foi encontrado.")
        print("Verifique se o nome do arquivo está correto e se ele está na mesma pasta do script.")
    except KeyError as e:
        print(f"ERRO: Uma coluna esperada não foi encontrada: {e}")
        print("Verifique se as listas 'colunas_de_id' e 'colunas_de_emocao' no script correspondem ao seu arquivo CSV.")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
        sys.exit(1) # Termina o script com erro


# --- Execução do Script ---
if __name__ == "__main__":
    transformar_dados(
        input_file=arquivo_de_entrada,
        output_file=arquivo_de_saida,
        id_cols=colunas_de_id,
        emotion_cols=colunas_de_emocao,
        output_sep=separador_saida
    )